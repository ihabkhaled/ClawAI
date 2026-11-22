import { PaygCreditExhaustedError } from '@claw/shared-entitlements';
import { BillingErrorCode, PaygSurface } from '@claw/shared-types';

import { LiveCreditRefusal } from '../../../../common/enums/live-credit-refusal.enum';
import { LivePaidBlockManager } from '../live-paid-block.manager';

const block = {
  session: { id: 'sess1', userId: 'user1' },
  blockIndex: 4,
  seconds: 60,
  key: 'live:sess1:4',
} as never;

/** $0.02 per minute: one full 60-second block costs 20,000 micro-USD. */
const PRICE = 20_000;

function setup() {
  const hold = { metered: true, clamped: false, reservationId: 'r1' };
  const payg = {
    reserve: vi.fn().mockResolvedValue(hold),
    finalize: vi.fn().mockResolvedValue(undefined),
    release: vi.fn().mockResolvedValue(undefined),
  };
  const redis = {
    incr: vi.fn().mockResolvedValue(2),
    expire: vi.fn().mockResolvedValue(1),
    del: vi.fn().mockResolvedValue(1),
  };
  return { manager: new LivePaidBlockManager(payg as never, redis as never), payg, redis, hold };
}

describe('LivePaidBlockManager', () => {
  it('reserves the block at its fixed price under LIVE_INTELLIGENCE with the block key as requestId', async () => {
    const { manager, payg, hold } = setup();
    await expect(manager.reserve(block, PRICE)).resolves.toEqual({ held: true, hold });
    expect(payg.reserve).toHaveBeenCalledWith({
      userId: 'user1',
      requestId: 'live:sess1:4',
      provider: 'CLAW_LIVE',
      model: 'live-intelligence',
      surface: PaygSurface.LIVE_INTELLIGENCE,
      promptTokens: 0,
      cachedPromptTokens: 0,
      requestedMaxOutputTokens: 1,
      fixedCostMicroUsd: 20_000,
    });
  });

  it('prices a partial block by ceil(price * seconds / 60), never truncating', async () => {
    const { manager, payg } = setup();
    // 20,001 * 7 / 60 = 2,333.45 -> 2,334
    await manager.reserve({ ...(block as object), seconds: 7 } as never, 20_001);
    expect(payg.reserve).toHaveBeenCalledWith(
      expect.objectContaining({ fixedCostMicroUsd: 2_334 }),
    );
    expect(payg.reserve.mock.calls[0]?.[0]).not.toHaveProperty('audioSeconds');
  });

  it('gives a clamped hold back and reports insufficient credit', async () => {
    const { manager, payg } = setup();
    payg.reserve.mockResolvedValue({ metered: true, clamped: true, reservationId: 'r2' });
    await expect(manager.reserve(block, PRICE)).resolves.toEqual({
      held: false,
      refusal: LiveCreditRefusal.INSUFFICIENT,
    });
    expect(payg.release).toHaveBeenCalledWith(
      expect.objectContaining({ reservationId: 'r2' }),
      'CANCELLED',
    );
  });

  it.each([
    [
      new PaygCreditExhaustedError(BillingErrorCode.PAYG_CREDIT_EXHAUSTED, 0, 1),
      LiveCreditRefusal.INSUFFICIENT,
    ],
    [
      new PaygCreditExhaustedError(BillingErrorCode.PAYG_PRICING_UNAVAILABLE, 0, null),
      LiveCreditRefusal.METER_UNAVAILABLE,
    ],
    [
      new PaygCreditExhaustedError(BillingErrorCode.PAYG_MODEL_UNPRICED, 0, null),
      LiveCreditRefusal.METER_UNAVAILABLE,
    ],
    [new Error('socket hang up'), LiveCreditRefusal.METER_UNAVAILABLE],
  ])('classifies a refusal (%s)', async (error, refusal) => {
    const { manager, payg } = setup();
    payg.reserve.mockRejectedValue(error);
    await expect(manager.reserve(block, PRICE)).resolves.toEqual({ held: false, refusal });
  });

  it("finalizes at the delivered seconds' fixed price with zero units", async () => {
    const { manager, payg, hold } = setup();
    await manager.finalize(block, hold as never, PRICE);
    expect(payg.finalize).toHaveBeenCalledWith(
      hold,
      { promptTokens: 0, completionTokens: 0, cachedPromptTokens: 0, reasoningTokens: 0 },
      { fixedCostMicroUsd: 20_000 },
    );
  });

  it('counts and clears consecutive meter failures per session', async () => {
    const { manager, redis } = setup();
    await expect(manager.recordMeterFailure('sess1')).resolves.toBe(2);
    expect(redis.incr).toHaveBeenCalledWith('live:meterfail:sess1');
    expect(redis.expire).toHaveBeenCalledWith('live:meterfail:sess1', 3600);
    await manager.clearMeterFailures('sess1');
    expect(redis.del).toHaveBeenCalledWith('live:meterfail:sess1');
  });
});
