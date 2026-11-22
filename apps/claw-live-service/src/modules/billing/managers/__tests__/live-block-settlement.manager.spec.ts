import { LiveCreditRefusal } from '../../../../common/enums/live-credit-refusal.enum';
import { LiveSettleOutcome } from '../../../../common/enums/live-settle-outcome.enum';
import { LiveStatusCode } from '../../../../common/enums/live-status-code.enum';
import { LiveChargeKind, LiveSessionState } from '../../../../generated/prisma';
import { LiveSettleConflictError } from '../../errors/live-settle-conflict.error';
import type { LiveBlock, LiveSettleContext } from '../../types/live-billing.types';
import { LiveBlockSettlementManager } from '../live-block-settlement.manager';

const NOW = new Date('2026-11-22T12:00:00.000Z');

function session(overrides: Record<string, unknown> = {}) {
  return {
    id: 'sess1',
    userId: 'user1',
    runId: 'run1',
    state: LiveSessionState.ACTIVE,
    paidApprovedAt: null as Date | null,
    spendingCapMicroUsd: null as bigint | null,
    spentMicroUsd: 0n,
    nextBlockIndex: 0,
    pendingSeconds: 60,
    ...overrides,
  };
}

function block(overrides: Record<string, unknown> = {}, seconds = 60): LiveBlock {
  const s = session(overrides);
  return {
    session: s,
    blockIndex: s.nextBlockIndex,
    seconds,
    key: `live:${s.id}:${String(s.nextBlockIndex)}`,
  };
}

function ctx(overrides: Partial<LiveSettleContext> = {}): LiveSettleContext {
  return {
    policyVersion: 3,
    plan: { freeSecondsPerMonth: 1800, paidMicroUsdPerMinute: 20_000 },
    graceSeconds: 60,
    month: '2026-11',
    now: NOW,
    final: false,
    ...overrides,
  };
}

function setup(
  options: {
    freeUsed?: number;
    billing?: { graceConsumed: boolean; graceStartedAt: Date | null } | null;
  } = {},
) {
  const charges: Array<Record<string, unknown>> = [];
  const advances: Array<Record<string, unknown>> = [];
  const repository = {
    ensureMonth: vi.fn().mockResolvedValue({ freeSecondsUsed: options.freeUsed ?? 0 }),
    takeFreeSeconds: vi.fn().mockResolvedValue(true),
    createCharge: vi.fn(async (_tx: unknown, input: Record<string, unknown>) => {
      charges.push(input);
    }),
    addPaidSeconds: vi.fn().mockResolvedValue(undefined),
    advanceSession: vi.fn(async (_tx: unknown, advance: Record<string, unknown>) => {
      advances.push(advance);
      return true;
    }),
    transaction: vi.fn(async (work: (tx: unknown) => Promise<void>) => work({})),
    stopSession: vi.fn().mockResolvedValue(undefined),
    setSessionState: vi.fn().mockResolvedValue(true),
    ensureBillingState: vi.fn().mockResolvedValue({}),
    startGrace: vi.fn().mockResolvedValue(true),
    findBillingState: vi.fn().mockResolvedValue(options.billing ?? null),
    resetGrace: vi.fn().mockResolvedValue(undefined),
  };
  const hold = {
    metered: true,
    reservationId: 'res-1',
    clamped: false,
    maxOutputTokens: 1,
    heldMicroUsd: 20_000,
    availableAfterMicroUsd: 0,
    reason: null,
  };
  const paid = {
    reserve: vi.fn().mockResolvedValue({ held: true, hold }),
    finalize: vi.fn().mockResolvedValue(undefined),
    recordMeterFailure: vi.fn().mockResolvedValue(1),
    clearMeterFailures: vi.fn().mockResolvedValue(undefined),
  };
  const publisher = { publish: vi.fn().mockResolvedValue(undefined) };
  const manager = new LiveBlockSettlementManager(
    repository as never,
    paid as never,
    publisher as never,
  );
  return { manager, repository, paid, publisher, charges, advances, hold };
}

describe('LiveBlockSettlementManager', () => {
  it('charges a block to the free monthly seconds first', async () => {
    const { manager, charges, advances, paid } = setup();
    const result = await manager.settle(block(), ctx());
    expect(result).toEqual({ outcome: LiveSettleOutcome.FREE, state: LiveSessionState.ACTIVE });
    expect(charges).toEqual([
      expect.objectContaining({
        idempotencyKey: 'live:sess1:0',
        kind: LiveChargeKind.FREE,
        seconds: 60,
        microUsd: 0n,
        policyVersion: 3,
      }),
    ]);
    expect(advances[0]).toMatchObject({ sessionId: 'sess1', expectedBlockIndex: 0, seconds: 60 });
    expect(paid.reserve).not.toHaveBeenCalled();
  });

  it('splits a block at the free boundary: free part, then the rest as the next block on the paid path', async () => {
    const { manager, charges } = setup({ freeUsed: 1780 });
    const approved = { paidApprovedAt: NOW };
    const result = await manager.settle(block(approved), ctx());
    expect(result.outcome).toBe(LiveSettleOutcome.PAID);
    expect(charges.map((c) => [c.idempotencyKey, c.kind, c.seconds, c.microUsd])).toEqual([
      ['live:sess1:0', LiveChargeKind.FREE, 20, 0n],
      ['live:sess1:1', LiveChargeKind.PAID, 40, 13_334n],
    ]);
  });

  it('asks for credits (FREE_EXHAUSTED) when free seconds are gone and nothing is approved', async () => {
    const { manager, repository, publisher, paid } = setup({ freeUsed: 1800 });
    const result = await manager.settle(block(), ctx());
    expect(result).toEqual({
      outcome: LiveSettleOutcome.CREDITS_REQUIRED,
      state: LiveSessionState.CREDITS_REQUIRED,
    });
    expect(repository.stopSession).toHaveBeenCalledWith('sess1', LiveSessionState.CREDITS_REQUIRED);
    expect(paid.reserve).not.toHaveBeenCalled();
    expect(publisher.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        runId: 'run1',
        status: LiveStatusCode.FREE_EXHAUSTED,
        data: expect.objectContaining({
          sessionId: 'sess1',
          sessionState: LiveSessionState.CREDITS_REQUIRED,
        }),
      }),
    );
  });

  it('charges an approved block through the PAYG meter and resets the grace episode', async () => {
    const { manager, charges, advances, paid, repository, hold } = setup({ freeUsed: 1800 });
    const result = await manager.settle(
      block({ paidApprovedAt: NOW, state: LiveSessionState.GRACE }),
      ctx(),
    );
    expect(result).toEqual({ outcome: LiveSettleOutcome.PAID, state: LiveSessionState.ACTIVE });
    expect(charges[0]).toMatchObject({
      kind: LiveChargeKind.PAID,
      microUsd: 20_000n,
      reservationId: 'res-1',
    });
    expect(advances[0]).toMatchObject({ spentMicroUsd: 20_000n, state: LiveSessionState.ACTIVE });
    expect(repository.addPaidSeconds).toHaveBeenCalledWith({}, 'user1', '2026-11', 60);
    expect(paid.reserve).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'live:sess1:0' }),
      20_000,
    );
    expect(paid.finalize).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'live:sess1:0' }),
      hold,
      20_000,
    );
    expect(repository.resetGrace).toHaveBeenCalledWith('user1');
  });

  it('records 0 micro-USD when auth answers unmetered', async () => {
    const { manager, charges, paid } = setup({ freeUsed: 1800 });
    paid.reserve.mockResolvedValue({ held: true, hold: { metered: false, reservationId: null } });
    await manager.settle(block({ paidApprovedAt: NOW }), ctx());
    expect(charges[0]).toMatchObject({
      kind: LiveChargeKind.PAID,
      microUsd: 0n,
      reservationId: null,
    });
  });

  it('stops at the spending cap without reserving', async () => {
    const { manager, paid, publisher } = setup({ freeUsed: 1800 });
    const result = await manager.settle(
      block({ paidApprovedAt: NOW, spendingCapMicroUsd: 30_000n, spentMicroUsd: 20_000n }),
      ctx(),
    );
    expect(result.outcome).toBe(LiveSettleOutcome.CREDITS_REQUIRED);
    expect(paid.reserve).not.toHaveBeenCalled();
    expect(publisher.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        status: LiveStatusCode.CREDITS_REQUIRED,
        data: expect.objectContaining({ reason: 'SPENDING_CAP' }),
      }),
    );
  });

  it('opens the one grace window on insufficient credit and records a 0 micro-USD GRACE charge', async () => {
    const { manager, paid, repository, charges, publisher } = setup({ freeUsed: 1800 });
    paid.reserve.mockResolvedValue({ held: false, refusal: LiveCreditRefusal.INSUFFICIENT });
    const result = await manager.settle(block({ paidApprovedAt: NOW }), ctx());
    expect(result).toEqual({ outcome: LiveSettleOutcome.GRACE, state: LiveSessionState.GRACE });
    expect(repository.startGrace).toHaveBeenCalledWith('user1', NOW);
    expect(charges[0]).toMatchObject({ kind: LiveChargeKind.GRACE, microUsd: 0n, seconds: 60 });
    expect(publisher.publish).toHaveBeenCalledWith(
      expect.objectContaining({ status: LiveStatusCode.GRACE }),
    );
  });

  it('keeps charging GRACE while inside an already-open window', async () => {
    const startedAt = new Date(NOW.getTime() - 30_000);
    const { manager, paid, repository, charges } = setup({
      freeUsed: 1800,
      billing: { graceConsumed: true, graceStartedAt: startedAt },
    });
    repository.startGrace.mockResolvedValue(false);
    paid.reserve.mockResolvedValue({ held: false, refusal: LiveCreditRefusal.INSUFFICIENT });
    const result = await manager.settle(block({ paidApprovedAt: NOW }), ctx());
    expect(result.outcome).toBe(LiveSettleOutcome.GRACE);
    expect(charges[0]).toMatchObject({ kind: LiveChargeKind.GRACE });
  });

  it('exhausts once the grace window elapsed — a reconnect (new session) cannot reset it', async () => {
    const startedAt = new Date(NOW.getTime() - 61_000);
    const { manager, paid, repository, charges, publisher } = setup({
      freeUsed: 1800,
      billing: { graceConsumed: true, graceStartedAt: startedAt },
    });
    repository.startGrace.mockResolvedValue(false);
    paid.reserve.mockResolvedValue({ held: false, refusal: LiveCreditRefusal.INSUFFICIENT });
    const fresh = block({ id: 'sess-new', paidApprovedAt: NOW, nextBlockIndex: 0 });
    const result = await manager.settle(fresh, ctx());
    expect(result).toEqual({
      outcome: LiveSettleOutcome.EXHAUSTED,
      state: LiveSessionState.EXHAUSTED,
    });
    expect(charges).toHaveLength(0);
    expect(repository.stopSession).toHaveBeenCalledWith('sess-new', LiveSessionState.EXHAUSTED);
    expect(publisher.publish).toHaveBeenCalledWith(
      expect.objectContaining({ status: LiveStatusCode.EXHAUSTED }),
    );
  });

  it('exhausts straight away when the policy grants no grace', async () => {
    const { manager, paid, repository } = setup({
      freeUsed: 1800,
      billing: { graceConsumed: false, graceStartedAt: null },
    });
    paid.reserve.mockResolvedValue({ held: false, refusal: LiveCreditRefusal.INSUFFICIENT });
    const result = await manager.settle(block({ paidApprovedAt: NOW }), ctx({ graceSeconds: 0 }));
    expect(result.outcome).toBe(LiveSettleOutcome.EXHAUSTED);
    expect(repository.startGrace).not.toHaveBeenCalled();
  });

  it('defers on a meter outage: nothing charged, seconds stay pending', async () => {
    const { manager, paid, charges, repository } = setup({ freeUsed: 1800 });
    paid.reserve.mockResolvedValue({ held: false, refusal: LiveCreditRefusal.METER_UNAVAILABLE });
    const result = await manager.settle(block({ paidApprovedAt: NOW }), ctx());
    expect(result).toEqual({ outcome: LiveSettleOutcome.DEFERRED, state: LiveSessionState.ACTIVE });
    expect(charges).toHaveLength(0);
    expect(repository.stopSession).not.toHaveBeenCalled();
  });

  it('stops the AI after three consecutive meter failures', async () => {
    const { manager, paid, repository } = setup({ freeUsed: 1800 });
    paid.reserve.mockResolvedValue({ held: false, refusal: LiveCreditRefusal.METER_UNAVAILABLE });
    paid.recordMeterFailure.mockResolvedValue(3);
    const result = await manager.settle(block({ paidApprovedAt: NOW }), ctx());
    expect(result.outcome).toBe(LiveSettleOutcome.EXHAUSTED);
    expect(repository.stopSession).toHaveBeenCalledWith('sess1', LiveSessionState.EXHAUSTED);
  });

  it('is idempotent: a retried block whose key is already written is skipped', async () => {
    const { manager, repository, paid } = setup({ freeUsed: 1800 });
    repository.transaction.mockRejectedValue(Object.assign(new Error('dup'), { code: 'P2002' }));
    const result = await manager.settle(block({ paidApprovedAt: NOW }), ctx());
    expect(result.outcome).toBe(LiveSettleOutcome.SKIPPED);
    expect(paid.finalize).not.toHaveBeenCalled();
  });

  it('skips when the free seconds were taken concurrently (fenced take matched no row)', async () => {
    const { manager, repository } = setup();
    repository.transaction.mockRejectedValue(new LiveSettleConflictError('FREE_SECONDS_RACE'));
    const result = await manager.settle(block(), ctx());
    expect(result.outcome).toBe(LiveSettleOutcome.SKIPPED);
  });

  it('rethrows unexpected database errors', async () => {
    const { manager, repository } = setup();
    repository.transaction.mockRejectedValue(new Error('db down'));
    await expect(manager.settle(block(), ctx())).rejects.toThrow('db down');
  });

  it('rolls back when the session block index already advanced', async () => {
    const { manager, repository } = setup();
    repository.advanceSession.mockResolvedValue(false);
    const result = await manager.settle(block(), ctx());
    expect(result.outcome).toBe(LiveSettleOutcome.SKIPPED);
  });

  it('in final (close) mode records the charge but never changes the session state', async () => {
    const { manager, advances, repository, publisher } = setup({ freeUsed: 1800 });
    const result = await manager.settle(block({ paidApprovedAt: NOW }, 25), ctx({ final: true }));
    expect(result).toEqual({ outcome: LiveSettleOutcome.PAID, state: LiveSessionState.ACTIVE });
    expect(advances[0]).not.toHaveProperty('state');
    expect(advances[0]).toMatchObject({ seconds: 25, spentMicroUsd: 8334n });
    const unapproved = setup({ freeUsed: 1800 });
    await unapproved.manager.settle(block({}, 25), ctx({ final: true }));
    expect(unapproved.repository.stopSession).toHaveBeenCalledWith('sess1', null);
    expect(unapproved.publisher.publish).not.toHaveBeenCalled();
    expect(repository.stopSession).not.toHaveBeenCalled();
    expect(publisher.publish).not.toHaveBeenCalled();
  });

  describe('expireGraceIfDue', () => {
    it('moves GRACE to EXHAUSTED after the window and tells the viewer', async () => {
      const { manager, repository, publisher } = setup({
        billing: { graceConsumed: true, graceStartedAt: new Date(NOW.getTime() - 60_000) },
      });
      const state = await manager.expireGraceIfDue(
        session({ state: LiveSessionState.GRACE }),
        60,
        NOW,
      );
      expect(state).toBe(LiveSessionState.EXHAUSTED);
      expect(repository.setSessionState).toHaveBeenCalledWith(
        'sess1',
        LiveSessionState.GRACE,
        LiveSessionState.EXHAUSTED,
      );
      expect(publisher.publish).toHaveBeenCalledWith(
        expect.objectContaining({ status: LiveStatusCode.EXHAUSTED }),
      );
    });

    it('leaves a session inside its window, or not in GRACE, alone', async () => {
      const { manager, repository } = setup({
        billing: { graceConsumed: true, graceStartedAt: new Date(NOW.getTime() - 10_000) },
      });
      expect(
        await manager.expireGraceIfDue(session({ state: LiveSessionState.GRACE }), 60, NOW),
      ).toBe(LiveSessionState.GRACE);
      expect(await manager.expireGraceIfDue(session(), 60, NOW)).toBe(LiveSessionState.ACTIVE);
      expect(repository.setSessionState).not.toHaveBeenCalled();
    });
  });

  it('does not publish for a session without a run', async () => {
    const { manager, publisher } = setup({ freeUsed: 1800 });
    await manager.settle(block({ runId: null }), ctx());
    expect(publisher.publish).not.toHaveBeenCalled();
  });
});
