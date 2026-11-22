import { LiveSettleOutcome } from '../../../../common/enums/live-settle-outcome.enum';
import { LiveSessionState } from '../../../../generated/prisma';
import { BillingService } from '../billing.service';

const policy = { version: 7, config: { graceSeconds: 60 } };
const plan = { freeSecondsPerMonth: 1800, paidMicroUsdPerMinute: 20_000 };
const session = {
  id: 'sess1',
  userId: 'user1',
  runId: 'run1',
  state: LiveSessionState.ACTIVE,
  paidApprovedAt: null,
  spendingCapMicroUsd: null,
  spentMicroUsd: 0n,
  nextBlockIndex: 2,
  pendingSeconds: 60,
};

function setup() {
  const policies = { active: vi.fn().mockResolvedValue(policy) };
  const plans = { planPolicy: vi.fn().mockResolvedValue(plan) };
  const repository = {
    findCharge: vi.fn().mockResolvedValue(null),
    findMonth: vi.fn().mockResolvedValue({ freeSecondsUsed: 120 }),
  };
  const settlement = {
    settle: vi
      .fn()
      .mockResolvedValue({ outcome: LiveSettleOutcome.FREE, state: LiveSessionState.ACTIVE }),
    expireGraceIfDue: vi.fn().mockResolvedValue(LiveSessionState.EXHAUSTED),
  };
  const service = new BillingService(
    policies as never,
    plans as never,
    repository as never,
    settlement as never,
  );
  return { service, policies, plans, repository, settlement };
}

describe('BillingService', () => {
  it('settles the next block with the active policy version and the plan', async () => {
    const { service, settlement } = setup();
    const result = await service.settleBlock(session, 60);
    expect(result.outcome).toBe(LiveSettleOutcome.FREE);
    expect(settlement.settle).toHaveBeenCalledWith(
      { session, blockIndex: 2, seconds: 60, key: 'live:sess1:2' },
      expect.objectContaining({ policyVersion: 7, plan, graceSeconds: 60, final: false }),
    );
  });

  it('skips nothing-to-settle and already-written blocks without touching the meter', async () => {
    const { service, settlement, repository } = setup();
    await expect(service.settleBlock(session, 0)).resolves.toMatchObject({
      outcome: LiveSettleOutcome.SKIPPED,
    });
    repository.findCharge.mockResolvedValue({ id: 'c1' });
    await expect(service.settleBlock(session, 60)).resolves.toMatchObject({
      outcome: LiveSettleOutcome.SKIPPED,
    });
    expect(settlement.settle).not.toHaveBeenCalled();
  });

  it('passes the final flag for a closing settlement', async () => {
    const { service, settlement } = setup();
    await service.settleBlock(session, 12, { final: true });
    expect(settlement.settle).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ final: true }),
    );
  });

  it('reports usage from the active policy and this month row', async () => {
    const { service } = setup();
    const usage = await service.usage('user1');
    expect(usage).toMatchObject({
      freeSecondsTotal: 1800,
      freeSecondsUsed: 120,
      paidMicroUsdPerMinute: 20_000,
      graceSeconds: 60,
      policyVersion: 7,
    });
    expect(usage.month).toMatch(/^\d{4}-\d{2}$/u);
  });

  it('reports zero used when the month has no row', async () => {
    const { service, repository } = setup();
    repository.findMonth.mockResolvedValue(null);
    await expect(service.usage('user1')).resolves.toMatchObject({ freeSecondsUsed: 0 });
  });

  it('delegates grace expiry with the policy grace length', async () => {
    const { service, settlement } = setup();
    await expect(service.expireGraceIfDue(session)).resolves.toBe(LiveSessionState.EXHAUSTED);
    expect(settlement.expireGraceIfDue).toHaveBeenCalledWith(session, 60, expect.any(Date));
  });
});
