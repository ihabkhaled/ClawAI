import { type Mock, vi } from 'vitest';
import { ModelCostClass, PaygBillingMode, PaygSurface, UserRole } from '@claw/shared-types';

import { type RedisService } from '../../../../infrastructure/redis/redis.service';
import { type AuthRepository } from '../../../auth/repositories/auth.repository';
import { type WeightedUsageRepository } from '../../../quota/repositories/weighted-usage.repository';
import { type SystemSettingService } from '../../../system-settings/services/system-setting.service';
import { type ConnectorPolicyClient } from '../../clients/connector-policy.client';
import { type ModelRateClient } from '../../clients/model-rate.client';
import { type CreditLedgerRepository } from '../../repositories/credit-ledger.repository';
import { type CreditEventService } from '../../services/credit-event.service';
import { type CreditBillingModeService } from '../../services/credit-billing-mode.service';
import { type CreditFreeAllowanceService } from '../../services/credit-free-allowance.service';
import { type CreditGrantService } from '../../services/credit-grant.service';
import { type CreditWalletService } from '../../services/credit-wallet.service';
import { type PaygRateSnapshot } from '../../types/credit.types';
import { CreditReservationManager } from '../credit-reservation.manager';

/**
 * F093: Anthropic prompt-cache WRITES in the PAYG money path.
 *
 * The invariant that matters is the one between the two halves: `applySettlement`
 * charges `min(actual, held)`, so a hold sized at the plain input rate would
 * silently absorb the cache-write premium. These cases drive the real manager
 * (reserve THEN finalize against the hold it actually took), not the pricing
 * helper alone.
 *
 * Usage figures follow the documented Messages API `usage` object
 * (`input_tokens` EXCLUDES the cache counters); they are hand-written to that
 * shape, not captured from a live call.
 */

const SONNET_WRITE = 3_750_000;

function sonnet(cacheWritePerMillionMicroUsd: number | null): PaygRateSnapshot {
  return {
    rates: {
      provider: 'ANTHROPIC',
      model: 'claude-sonnet-4',
      version: 1,
      currency: 'USD',
      inputPerMillionMicroUsd: 3_000_000,
      outputPerMillionMicroUsd: 15_000_000,
      cachedInputPerMillionMicroUsd: 300_000,
      cacheWritePerMillionMicroUsd,
      reasoningPerMillionMicroUsd: 15_000_000,
      imagePerUnitMicroUsd: null,
      audioPerUnitMicroUsd: null,
      videoPerUnitMicroUsd: null,
      toolCallPerUnitMicroUsd: null,
      searchCallPerUnitMicroUsd: null,
      ttsPerCharacterMicroUsd: null,
      costClass: ModelCostClass.PREMIUM,
      isAdminOverride: false,
      effectiveFrom: '2026-10-01T00:00:00.000Z',
      lastVerifiedAt: null,
      source: 'SEED',
    },
    isPriced: true,
    isLocalComputeFallback: false,
  };
}

// Plenty of credit, so the affordability clamp never shortens an answer here.
const RICH = 1_000_000_000_000n;

const wallet = {
  id: 'wallet-1',
  userId: 'user-1',
  grantMicroUsd: RICH,
  purchasedMicroUsd: 0n,
  reservedMicroUsd: 0n,
  periodGrantMicroUsd: RICH,
  periodKey: '2026-10',
  grantResetsAt: new Date('2026-11-01T00:00:00.000Z'),
  lifetimeGrantedMicroUsd: RICH,
  lifetimePurchasedMicroUsd: 0n,
  lifetimeConsumedMicroUsd: 0n,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function record(held: bigint) {
  return {
    id: 'row-1',
    userId: 'user-1',
    planId: null,
    subscriptionId: null,
    reservationId: 'res-1',
    requestId: 'req-1',
    provider: 'ANTHROPIC',
    model: 'claude-sonnet-4',
    workflow: null,
    rawInputTokens: 0,
    rawCachedTokens: 0,
    rawCacheWriteTokens: 0,
    rawReasoningTokens: 0,
    rawOutputTokens: 0,
    toolCallCount: 0,
    isPayg: true,
    creditGrantMicroUsd: held,
    creditPurchasedMicroUsd: 0n,
    weightedTokens: 0,
    estimatedCostMicroUsd: 0n,
    actualCostMicroUsd: null,
    currency: 'USD',
    state: 'RESERVED',
    dayKey: '2026-10-01',
    weekKey: '2026-W40',
    monthKey: '2026-10',
    billingPeriodKey: null,
    createdAt: new Date(),
    finalizedAt: null,
  };
}

/** ceil(units * rate / 1e6) in BigInt: an independent reference for the expected figures. */
function refCost(units: number, rate: number): bigint {
  return (BigInt(units) * BigInt(rate) + 999_999n) / 1_000_000n;
}

describe('PAYG credit: prompt-cache writes (F093)', () => {
  let rates: { findRate: Mock };
  let wallets: { applyHold: Mock; applySettlement: Mock; ensure: Mock; getBalances: Mock };
  let usage: {
    markFinalized: Mock;
    findByReservationId: Mock;
    createReservation: Mock;
    findOpenPaygReservation: Mock;
  };
  let manager: CreditReservationManager;

  function build(rate: PaygRateSnapshot): CreditReservationManager {
    rates.findRate.mockResolvedValue(rate);
    return new CreditReservationManager(
      {
        getClient: vi.fn().mockReturnValue({
          eval: vi.fn().mockResolvedValue([1, '', '0', '0']),
          mget: vi.fn().mockResolvedValue([null, null]),
        }),
      } as unknown as RedisService,
      wallets as unknown as CreditWalletService,
      {
        ensureCurrentPeriod: vi.fn().mockResolvedValue({ wallet, availableMicroUsd: RICH }),
      } as unknown as CreditGrantService,
      rates as unknown as ModelRateClient,
      {
        getPolicy: vi.fn().mockResolvedValue({ ANTHROPIC: true }),
      } as unknown as ConnectorPolicyClient,
      { isEnabled: vi.fn().mockResolvedValue(true) } as unknown as SystemSettingService,
      usage as unknown as WeightedUsageRepository,
      {
        findUserById: vi.fn().mockResolvedValue({ id: 'user-1', role: UserRole.USER }),
      } as unknown as AuthRepository,
      {
        publishBalanceState: vi.fn().mockResolvedValue(undefined),
      } as unknown as CreditEventService,
      {
        findReservationAttribution: vi
          .fn()
          .mockResolvedValue({ surface: PaygSurface.CHAT, workflow: null }),
      } as unknown as CreditLedgerRepository,
      {
        resolvePolicy: vi.fn().mockResolvedValue(null),
        tryAdmit: vi.fn().mockResolvedValue({ status: 'SPENT', limit: 0 }),
        giveBack: vi.fn().mockResolvedValue(undefined),
      } as unknown as CreditFreeAllowanceService,
      {
        resolve: vi.fn().mockResolvedValue(PaygBillingMode.PAYG),
      } as unknown as CreditBillingModeService,
    );
  }

  beforeEach(() => {
    rates = { findRate: vi.fn() };
    wallets = {
      ensure: vi.fn().mockResolvedValue(wallet),
      getBalances: vi.fn().mockResolvedValue({ wallet, availableMicroUsd: RICH }),
      applyHold: vi.fn().mockResolvedValue(wallet),
      applySettlement: vi.fn().mockResolvedValue({
        chargedMicroUsd: 0n,
        refundedMicroUsd: 0n,
        availableAfterMicroUsd: 0n,
        periodGrantMicroUsd: RICH,
      }),
    };
    usage = {
      markFinalized: vi.fn().mockResolvedValue(1),
      findByReservationId: vi.fn(),
      createReservation: vi.fn().mockResolvedValue(record(0n)),
      findOpenPaygReservation: vi.fn().mockResolvedValue(null),
    };
    manager = build(sonnet(SONNET_WRITE));
  });

  const reserveInput = (overrides: Record<string, unknown> = {}) => ({
    userId: 'user-1',
    requestId: 'req-1',
    provider: 'ANTHROPIC',
    model: 'claude-sonnet-4',
    surface: PaygSurface.CHAT,
    workflow: null,
    promptTokens: 8_000,
    cachedPromptTokens: 0,
    requestedMaxOutputTokens: 2_000,
    ...overrides,
  });

  /** What the manager actually held for the last reserve, in micro-USD. */
  function heldTotal(): bigint {
    const call = wallets.applyHold.mock.calls.at(-1)?.[0] as {
      split: { grantMicroUsd: bigint; purchasedMicroUsd: bigint };
    };
    return call.split.grantMicroUsd + call.split.purchasedMicroUsd;
  }

  async function finalizeCharge(
    held: bigint,
    usagePayload: {
      promptTokens: number;
      completionTokens: number;
      cachedPromptTokens: number;
      cacheCreationPromptTokens?: number;
    },
  ): Promise<{ charged: bigint; markArg: Record<string, unknown> }> {
    usage.findByReservationId.mockResolvedValue(record(held));
    wallets.applySettlement.mockClear();
    usage.markFinalized.mockClear();
    await manager.finalize({
      reservationId: 'res-1',
      reasoningTokens: 0,
      toolCalls: 0,
      searchCalls: 0,
      ...usagePayload,
    });
    const settle = wallets.applySettlement.mock.calls[0]?.[0] as { actualMicroUsd: bigint };
    return {
      charged: settle.actualMicroUsd,
      markArg: usage.markFinalized.mock.calls[0]?.[0] as Record<string, unknown>,
    };
  }

  describe('reserve sizes the hold for the write premium', () => {
    it('holds the prompt at the write rate when the request asks for caching', async () => {
      await manager.reserve(reserveInput());
      const plain = heldTotal();
      wallets.applyHold.mockClear();
      await manager.reserve(reserveInput({ requestId: 'req-2', cacheWritePromptTokens: 8_000 }));
      const armed = heldTotal();

      // 2,000 output @ $15/M is common; the prompt moves from $3/M to $3.75/M.
      expect(plain).toBe(refCost(8_000, 3_000_000) + refCost(2_000, 15_000_000));
      expect(armed).toBe(refCost(8_000, SONNET_WRITE) + refCost(2_000, 15_000_000));
      expect(armed - plain).toBe(6_000n);
    });

    it('adds nothing when the model publishes no write rate', async () => {
      manager = build(sonnet(null));
      await manager.reserve(reserveInput());
      const plain = heldTotal();
      wallets.applyHold.mockClear();
      await manager.reserve(reserveInput({ requestId: 'req-2', cacheWritePromptTokens: 8_000 }));
      expect(heldTotal()).toBe(plain);
    });

    it('treats an absent cacheWritePromptTokens exactly as zero', async () => {
      await manager.reserve(reserveInput());
      const absent = heldTotal();
      wallets.applyHold.mockClear();
      await manager.reserve(reserveInput({ requestId: 'req-2', cacheWritePromptTokens: 0 }));
      expect(heldTotal()).toBe(absent);
    });
  });

  describe('finalize bills the write only from a published rate', () => {
    const COLD = {
      promptTokens: 8_012,
      completionTokens: 450,
      cachedPromptTokens: 0,
      cacheCreationPromptTokens: 8_000,
    };

    it('charges a cold write at the write rate, to the micro-USD', async () => {
      const { charged, markArg } = await finalizeCharge(RICH, COLD);
      expect(charged).toBe(
        refCost(12, 3_000_000) + refCost(8_000, SONNET_WRITE) + refCost(450, 15_000_000),
      );
      expect(charged).toBe(36_786n);
      expect(markArg).toMatchObject({
        rawInputTokens: 12,
        rawCachedTokens: 0,
        rawCacheWriteTokens: 8_000,
        rawOutputTokens: 450,
        actualCostMicroUsd: 36_786n,
      });
    });

    it('NO rate row: the write is billed as ordinary input, never free and never at a premium', async () => {
      manager = build(sonnet(null));
      const { charged, markArg } = await finalizeCharge(RICH, COLD);
      expect(charged).toBe(refCost(8_012, 3_000_000) + refCost(450, 15_000_000));
      // The count is still recorded for attribution even though no premium applies.
      expect(markArg).toMatchObject({ rawCacheWriteTokens: 8_000, rawInputTokens: 12 });
    });

    it('a zero rate row is not "free to write": it falls back to the input rate', async () => {
      manager = build(sonnet(0));
      const { charged } = await finalizeCharge(RICH, COLD);
      expect(charged).toBe(refCost(8_012, 3_000_000) + refCost(450, 15_000_000));
    });

    it('an absent cacheCreationPromptTokens prices exactly as before F093', async () => {
      const legacy = { promptTokens: 1_000, completionTokens: 2_000, cachedPromptTokens: 200 };
      const { charged, markArg } = await finalizeCharge(RICH, legacy);
      expect(charged).toBe(
        refCost(800, 3_000_000) + refCost(200, 300_000) + refCost(2_000, 15_000_000),
      );
      expect(markArg).toMatchObject({ rawCacheWriteTokens: 0 });
    });

    it('prices a mixed read/write turn slice by slice', async () => {
      const { charged } = await finalizeCharge(RICH, {
        promptTokens: 8_040,
        completionTokens: 90,
        cachedPromptTokens: 6_800,
        cacheCreationPromptTokens: 1_200,
      });
      expect(charged).toBe(
        refCost(40, 3_000_000) +
          refCost(6_800, 300_000) +
          refCost(1_200, SONNET_WRITE) +
          refCost(90, 15_000_000),
      );
    });

    it('stays exact at 4,000,000 written tokens', async () => {
      const { charged } = await finalizeCharge(RICH * 100n, {
        promptTokens: 4_001_000,
        completionTokens: 64_000,
        cachedPromptTokens: 0,
        cacheCreationPromptTokens: 4_000_000,
      });
      expect(charged).toBe(
        refCost(1_000, 3_000_000) + refCost(4_000_000, SONNET_WRITE) + refCost(64_000, 15_000_000),
      );
    });

    it('a write larger than the prompt is clamped, never over-charged', async () => {
      const { charged } = await finalizeCharge(RICH, {
        promptTokens: 100,
        completionTokens: 0,
        cachedPromptTokens: 0,
        cacheCreationPromptTokens: 100_000,
      });
      expect(charged).toBe(refCost(100, SONNET_WRITE));
    });
  });

  describe('the hold the manager took covers the worst legal settlement', () => {
    it('armed: 150 random prompts, the whole prompt written and the whole ceiling generated', async () => {
      let state = 31;
      const next = (): number => {
        state = (state * 1_664_525 + 1_013_904_223) % 4_294_967_296;
        return state;
      };
      for (let i = 0; i < 150; i += 1) {
        const prompt = 1 + (next() % 80_000);
        const maxOut = 1 + (next() % 8_000);
        wallets.applyHold.mockClear();
        const outcome = await manager.reserve(
          reserveInput({
            requestId: `req-${String(i)}`,
            promptTokens: prompt,
            requestedMaxOutputTokens: maxOut,
            cacheWritePromptTokens: prompt,
          }),
        );
        const ceiling = (outcome as { maxOutputTokens: number }).maxOutputTokens;
        const held = heldTotal();
        const { charged } = await finalizeCharge(held, {
          promptTokens: prompt,
          completionTokens: ceiling,
          cachedPromptTokens: 0,
          cacheCreationPromptTokens: prompt,
        });
        // The manager hands applySettlement the TRUE cost; settlement then takes
        // min(actual, held). The hold must be at least the true cost, or the
        // difference is margin the platform eats.
        expect(charged).toBeLessThanOrEqual(held);
      }
    });

    it('unarmed (the bug this prevents): the same worst settlement EXCEEDS the hold', async () => {
      await manager.reserve(reserveInput());
      const held = heldTotal();
      const { charged } = await finalizeCharge(held, {
        promptTokens: 8_000,
        completionTokens: 2_000,
        cachedPromptTokens: 0,
        cacheCreationPromptTokens: 8_000,
      });
      expect(charged).toBeGreaterThan(held);
    });
  });

  describe('finalize is idempotent for a cache-write settlement', () => {
    const COLD = {
      reservationId: 'res-1',
      promptTokens: 8_012,
      completionTokens: 450,
      cachedPromptTokens: 0,
      cacheCreationPromptTokens: 8_000,
      reasoningTokens: 0,
      toolCalls: 0,
      searchCalls: 0,
    };

    it('a replayed finalize moves no money and records no second charge', async () => {
      usage.findByReservationId.mockResolvedValue(record(RICH));
      // First call wins the state transition; the replay finds it already settled.
      usage.markFinalized.mockResolvedValueOnce(1).mockResolvedValueOnce(0);
      const first = await manager.finalize(COLD);
      const replay = await manager.finalize(COLD);
      expect(first.settled).toBe(true);
      expect(replay.settled).toBe(false);
      expect(replay).not.toHaveProperty('settledCostMicroUsd');
      expect(wallets.applySettlement).toHaveBeenCalledTimes(1);
    });

    it('a concurrent pair of finalizes charges the write once', async () => {
      usage.findByReservationId.mockResolvedValue(record(RICH));
      usage.markFinalized.mockResolvedValueOnce(1).mockResolvedValueOnce(0);
      const outcomes = await Promise.all([manager.finalize(COLD), manager.finalize(COLD)]);
      expect(outcomes.filter((outcome) => outcome.settled)).toHaveLength(1);
      expect(wallets.applySettlement).toHaveBeenCalledTimes(1);
    });
  });
});
