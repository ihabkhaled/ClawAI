import { type Mock, vi } from 'vitest';
import {
  BillingErrorCode,
  ModelCostClass,
  PaygBillingMode,
  PaygSurface,
  UserRole,
} from '@claw/shared-types';

import { type RedisService } from '../../../../infrastructure/redis/redis.service';
import { type AuthRepository } from '../../../auth/repositories/auth.repository';
import { type WeightedUsageRepository } from '../../../quota/repositories/weighted-usage.repository';
import { type SystemSettingService } from '../../../system-settings/services/system-setting.service';
import { type ConnectorPolicyClient } from '../../clients/connector-policy.client';
import { type ModelRateClient } from '../../clients/model-rate.client';
import { type CreditLedgerRepository } from '../../repositories/credit-ledger.repository';
import { type CreditBillingModeService } from '../../services/credit-billing-mode.service';
import { type CreditEventService } from '../../services/credit-event.service';
import { type CreditFreeAllowanceService } from '../../services/credit-free-allowance.service';
import { type CreditGrantService } from '../../services/credit-grant.service';
import { type CreditWalletService } from '../../services/credit-wallet.service';
import { type CreditReserveInput, type PaygRateSnapshot } from '../../types/credit.types';
import { CreditReservationManager } from '../credit-reservation.manager';

// $1 per million input tokens, $10 per million output tokens — the only real
// rate shape in the repository, and the one the affordability numbers below are
// hand-computed from.
const PRICED_RATE: PaygRateSnapshot = {
  rates: {
    provider: 'OPENAI',
    model: 'gpt-5',
    version: 1,
    currency: 'USD',
    inputPerMillionMicroUsd: 1_000_000,
    outputPerMillionMicroUsd: 10_000_000,
    cachedInputPerMillionMicroUsd: null,
    cacheWritePerMillionMicroUsd: null,
    reasoningPerMillionMicroUsd: null,
    imagePerUnitMicroUsd: null,
    audioPerUnitMicroUsd: null,
    videoPerUnitMicroUsd: null,
    toolCallPerUnitMicroUsd: null,
    searchCallPerUnitMicroUsd: null,
    ttsPerCharacterMicroUsd: null,
    costClass: ModelCostClass.STANDARD,
    isAdminOverride: false,
    effectiveFrom: '2026-08-29T00:00:00.000Z',
    lastVerifiedAt: null,
    source: 'SEED',
  },
  isPriced: true,
  isLocalComputeFallback: false,
};

const makeWallet = (overrides: Record<string, unknown> = {}) => ({
  id: 'wallet-1',
  userId: 'user-1',
  grantMicroUsd: 50_000n,
  purchasedMicroUsd: 0n,
  reservedMicroUsd: 0n,
  periodGrantMicroUsd: 300_000n,
  periodKey: '2026-08',
  grantResetsAt: new Date('2026-09-01T00:00:00.000Z'),
  lifetimeGrantedMicroUsd: 300_000n,
  lifetimePurchasedMicroUsd: 0n,
  lifetimeConsumedMicroUsd: 0n,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const makeRecord = (overrides: Record<string, unknown> = {}) => ({
  id: 'row-1',
  userId: 'user-1',
  planId: null,
  subscriptionId: null,
  reservationId: 'res-1',
  requestId: 'req-1',
  provider: 'OPENAI',
  model: 'gpt-5',
  workflow: null,
  rawInputTokens: 0,
  rawCachedTokens: 0,
  rawCacheWriteTokens: 0,
  rawReasoningTokens: 0,
  rawOutputTokens: 0,
  toolCallCount: 0,
  isPayg: true,
  creditGrantMicroUsd: 50_000n,
  creditPurchasedMicroUsd: 0n,
  isFreeAllowance: false,
  weightedTokens: 0,
  estimatedCostMicroUsd: 0n,
  actualCostMicroUsd: null,
  currency: 'USD',
  state: 'RESERVED',
  dayKey: '2026-08-29',
  weekKey: '2026-W35',
  monthKey: '2026-08',
  billingPeriodKey: null,
  createdAt: new Date(),
  finalizedAt: null,
  ...overrides,
});

const DEFAULT_MAX_OUTPUT = 30_512;

const makeInput = (overrides: Partial<CreditReserveInput> = {}): CreditReserveInput => ({
  userId: 'user-1',
  requestId: 'req-1',
  provider: 'OPENAI',
  model: 'gpt-5',
  surface: PaygSurface.CHAT,
  workflow: null,
  promptTokens: 1000,
  cachedPromptTokens: 0,
  requestedMaxOutputTokens: DEFAULT_MAX_OUTPUT,
  ...overrides,
});

describe('CreditReservationManager', () => {
  let client: { eval: Mock; mget: Mock };
  let redis: { getClient: Mock };
  let wallets: {
    ensure: Mock;
    getBalances: Mock;
    applyHold: Mock;
    applyRelease: Mock;
    applySettlement: Mock;
    recordFreeAllowance: Mock;
  };
  let freeAllowance: { tryAdmit: Mock; giveBack: Mock; resolvePolicy: Mock };
  let grants: { ensureCurrentPeriod: Mock };
  let rates: { findRate: Mock; invalidate: Mock };
  let policy: { getPolicy: Mock };
  let settings: { isEnabled: Mock };
  let usage: {
    findOpenPaygReservation: Mock;
    createReservation: Mock;
    findByReservationId: Mock;
    markFinalized: Mock;
    markReleased: Mock;
    deleteByReservationId: Mock;
  };
  let users: { findUserById: Mock };
  let events: { publishBalanceState: Mock };
  let ledger: { findReservationAttribution: Mock };
  let billingModes: { resolve: Mock };
  let manager: CreditReservationManager;

  const build = (): CreditReservationManager =>
    new CreditReservationManager(
      redis as unknown as RedisService,
      wallets as unknown as CreditWalletService,
      grants as unknown as CreditGrantService,
      rates as unknown as ModelRateClient,
      policy as unknown as ConnectorPolicyClient,
      settings as unknown as SystemSettingService,
      usage as unknown as WeightedUsageRepository,
      users as unknown as AuthRepository,
      events as unknown as CreditEventService,
      ledger as unknown as CreditLedgerRepository,
      freeAllowance as unknown as CreditFreeAllowanceService,
      billingModes as unknown as CreditBillingModeService,
    );

  beforeEach(() => {
    client = {
      eval: vi.fn().mockResolvedValue([1, '', '0', '0']),
      mget: vi.fn().mockResolvedValue([null, null]),
    };
    redis = { getClient: vi.fn().mockReturnValue(client) };
    wallets = {
      ensure: vi.fn().mockResolvedValue(makeWallet()),
      getBalances: vi.fn().mockResolvedValue({
        wallet: makeWallet(),
        availableMicroUsd: 50_000n,
      }),
      applyHold: vi.fn().mockResolvedValue(makeWallet()),
      applyRelease: vi.fn().mockResolvedValue(makeWallet()),
      applySettlement: vi.fn().mockResolvedValue({
        chargedMicroUsd: 21_000n,
        refundedMicroUsd: 29_000n,
        availableAfterMicroUsd: 29_000n,
        periodGrantMicroUsd: 300_000n,
      }),
      recordFreeAllowance: vi.fn().mockResolvedValue(makeWallet()),
    };
    // Default: the plan gives no free requests (no policy), so every existing case
    // below is exactly the credit-only behaviour it was written against.
    freeAllowance = {
      resolvePolicy: vi.fn().mockResolvedValue(null),
      tryAdmit: vi.fn().mockResolvedValue({ status: 'SPENT', limit: 0 }),
      giveBack: vi.fn().mockResolvedValue(undefined),
    };
    grants = {
      ensureCurrentPeriod: vi.fn().mockResolvedValue({
        wallet: makeWallet(),
        availableMicroUsd: 50_000n,
      }),
    };
    rates = { findRate: vi.fn().mockResolvedValue(PRICED_RATE), invalidate: vi.fn() };
    policy = { getPolicy: vi.fn().mockResolvedValue({ OPENAI: true }) };
    settings = { isEnabled: vi.fn().mockResolvedValue(true) };
    usage = {
      findOpenPaygReservation: vi.fn().mockResolvedValue(null),
      createReservation: vi.fn().mockResolvedValue(makeRecord()),
      findByReservationId: vi.fn().mockResolvedValue(makeRecord()),
      markFinalized: vi.fn().mockResolvedValue(1),
      markReleased: vi.fn().mockResolvedValue(1),
      deleteByReservationId: vi.fn().mockResolvedValue(undefined),
    };
    users = { findUserById: vi.fn().mockResolvedValue({ id: 'user-1', role: UserRole.USER }) };
    events = { publishBalanceState: vi.fn().mockResolvedValue(undefined) };
    ledger = {
      findReservationAttribution: vi
        .fn()
        .mockResolvedValue({ surface: PaygSurface.CHAT, workflow: null }),
    };
    billingModes = { resolve: vi.fn().mockResolvedValue(PaygBillingMode.PAYG) };
    manager = build();
  });

  // Every unmetered answer carries the ceiling the caller asked for. This is
  // not decoration: `PaygMeter` reads `maxOutputTokens` off EVERY outcome
  // without branching on `metered`, and when this field was missing the client
  // treated the reply as malformed and failed CLOSED. With the kill switch off
  // — the default — that refused every paid model on the whole install.
  describe('classification short-circuits', () => {
    it('meters nothing while the kill switch is off', async () => {
      settings['isEnabled'].mockResolvedValue(false);
      const outcome = await manager.reserve(makeInput());
      expect(outcome).toEqual({
        metered: false,
        reason: 'METERING_DISABLED',
        maxOutputTokens: DEFAULT_MAX_OUTPUT,
      });
      // The switch is read once, before anything else — no wallet read, no
      // price lookup, no Redis round trip.
      expect(rates['findRate']).not.toHaveBeenCalled();
      expect(grants['ensureCurrentPeriod']).not.toHaveBeenCalled();
    });

    it('never meters a local provider', async () => {
      const outcome = await manager.reserve(makeInput({ provider: 'OLLAMA' }));
      expect(outcome).toEqual({
        metered: false,
        reason: 'NOT_PAYG',
        maxOutputTokens: DEFAULT_MAX_OUTPUT,
      });
      expect(rates['findRate']).not.toHaveBeenCalled();
    });

    it('never meters llama.cpp either', async () => {
      const outcome = await manager.reserve(makeInput({ provider: 'LLAMACPP' }));
      expect(outcome).toEqual({
        metered: false,
        reason: 'NOT_PAYG',
        maxOutputTokens: DEFAULT_MAX_OUTPUT,
      });
    });

    it('lets an administrator through without touching the wallet', async () => {
      users['findUserById'].mockResolvedValue({ id: 'admin-1', role: UserRole.ADMIN });
      const outcome = await manager.reserve(makeInput());
      expect(outcome).toEqual({
        metered: false,
        reason: 'ADMIN_BYPASS',
        maxOutputTokens: DEFAULT_MAX_OUTPUT,
      });
      expect(wallets['applyHold']).not.toHaveBeenCalled();
    });

    it('honours an administrator switching PAYG off for a provider', async () => {
      policy['getPolicy'].mockResolvedValue({ OPENAI: false });
      const outcome = await manager.reserve(makeInput());
      expect(outcome).toEqual({
        metered: false,
        reason: 'NOT_PAYG',
        maxOutputTokens: DEFAULT_MAX_OUTPUT,
      });
    });
  });

  describe('pricing failures fail CLOSED', () => {
    it('refuses with PAYG_PRICING_UNAVAILABLE when routing is unreachable and the cache is cold', async () => {
      rates['findRate'].mockResolvedValue(null);
      await expect(manager.reserve(makeInput())).rejects.toMatchObject({
        code: BillingErrorCode.PAYG_PRICING_UNAVAILABLE,
      });
      expect(wallets['applyHold']).not.toHaveBeenCalled();
    });

    it('refuses an unpriced model rather than serving it for free', async () => {
      rates['findRate'].mockResolvedValue({ ...PRICED_RATE, isPriced: false });
      await expect(manager.reserve(makeInput())).rejects.toMatchObject({
        code: BillingErrorCode.PAYG_MODEL_UNPRICED,
      });
    });

    // routing-service answers a LOCAL provider with `isPriced: true` at a rate
    // of zero. A metered provider resolving through that path would be billed
    // nothing at all, so it is refused here instead.
    it('refuses a PAYG provider that resolved through the local-compute zero-rate fallback', async () => {
      rates['findRate'].mockResolvedValue({
        ...PRICED_RATE,
        isLocalComputeFallback: true,
        rates: {
          ...PRICED_RATE.rates,
          inputPerMillionMicroUsd: 0,
          outputPerMillionMicroUsd: 0,
        },
      });
      await expect(manager.reserve(makeInput())).rejects.toMatchObject({
        code: BillingErrorCode.PAYG_MODEL_UNPRICED,
      });
      expect(wallets['applyHold']).not.toHaveBeenCalled();
    });
  });

  describe('the affordability clamp', () => {
    // $0.05 balance, $0.001 prompt, $10/M output → 4,900 affordable output
    // tokens against the 30,512 that was asked for.
    it('shortens the answer to fit the balance and says so', async () => {
      const outcome = await manager.reserve(makeInput());
      expect(outcome).toEqual({
        metered: true,
        reservationId: expect.any(String),
        maxOutputTokens: 4_900,
        clamped: true,
        heldMicroUsd: 50_000,
        availableAfterMicroUsd: 0,
      });
    });

    // D6: the provider is physically incapable of producing a response that
    // costs more than the balance, because the ceiling it is called with was
    // derived from that balance.
    it('holds no more than the balance it was computed from', async () => {
      await manager.reserve(makeInput());
      const holdCall = wallets['applyHold'].mock.calls[0];
      expect(holdCall).toBeDefined();
      const held = holdCall?.[0].split;
      expect(held.grantMicroUsd + held.purchasedMicroUsd).toBe(50_000n);
      expect(held.grantMicroUsd).toBe(50_000n);
      expect(held.purchasedMicroUsd).toBe(0n);
    });

    it('does not mark an unclamped request as clamped', async () => {
      const outcome = await manager.reserve(makeInput({ requestedMaxOutputTokens: 1000 }));
      expect(outcome).toMatchObject({ metered: true, maxOutputTokens: 1000, clamped: false });
    });

    it('refuses an empty wallet with PAYG_CREDIT_EXHAUSTED', async () => {
      grants['ensureCurrentPeriod'].mockResolvedValue({
        wallet: makeWallet({ grantMicroUsd: 0n }),
        availableMicroUsd: 0n,
      });
      await expect(manager.reserve(makeInput({ promptTokens: 0 }))).rejects.toMatchObject({
        code: BillingErrorCode.PAYG_CREDIT_EXHAUSTED,
      });
    });

    it('refuses when the prompt alone costs more than the balance', async () => {
      grants['ensureCurrentPeriod'].mockResolvedValue({
        wallet: makeWallet({ grantMicroUsd: 100n }),
        availableMicroUsd: 100n,
      });
      await expect(manager.reserve(makeInput({ promptTokens: 5000 }))).rejects.toMatchObject({
        code: BillingErrorCode.PAYG_PROMPT_TOO_EXPENSIVE,
      });
    });
  });

  describe('the atomic step', () => {
    it('refuses when the Lua script says a credit window is out of room', async () => {
      client.eval.mockResolvedValue([0, 'CREDIT_GRANT', '50000', '50000']);
      await expect(manager.reserve(makeInput())).rejects.toMatchObject({
        code: BillingErrorCode.PAYG_CREDIT_EXHAUSTED,
      });
      expect(usage['createReservation']).not.toHaveBeenCalled();
    });

    it('fails CLOSED on an unrecognisable Lua reply', async () => {
      client.eval.mockResolvedValue('unexpected');
      await expect(manager.reserve(makeInput())).rejects.toMatchObject({
        code: BillingErrorCode.PAYG_CREDIT_EXHAUSTED,
      });
    });

    it('gives the Redis counters back when the durable write fails', async () => {
      usage['createReservation'].mockRejectedValue(new Error('db down'));
      await expect(manager.reserve(makeInput())).rejects.toThrow('db down');
      // Reserve script + the compensating adjust.
      expect(client.eval).toHaveBeenCalledTimes(2);
      expect(usage['deleteByReservationId']).toHaveBeenCalledTimes(1);
    });
  });

  describe('idempotency', () => {
    it('reuses an open hold for a repeated (userId, requestId)', async () => {
      usage['findOpenPaygReservation'].mockResolvedValue(makeRecord());
      const outcome = await manager.reserve(makeInput());
      expect(outcome).toMatchObject({
        metered: true,
        reservationId: 'res-1',
        heldMicroUsd: 50_000,
      });
      // No second hold against the same wallet.
      expect(client.eval).not.toHaveBeenCalled();
      expect(usage['createReservation']).not.toHaveBeenCalled();
      expect(wallets['applyHold']).not.toHaveBeenCalled();
    });
  });

  describe('finalize', () => {
    it('prices the usage and moves the ledger', async () => {
      await manager.finalize({
        reservationId: 'res-1',
        promptTokens: 1000,
        completionTokens: 2000,
        cachedPromptTokens: 0,
        reasoningTokens: 0,
        toolCalls: 0,
        searchCalls: 0,
      });
      // 1,000 input @ $1/M + 2,000 output @ $10/M = 1,000 + 20,000 micro-USD.
      expect(wallets['applySettlement']).toHaveBeenCalledWith(
        expect.objectContaining({
          actualMicroUsd: 21_000n,
          reservationId: 'res-1',
          // Carried forward from the RESERVATION row so the settled line can
          // still say where the money went.
          surface: PaygSurface.CHAT,
        }),
      );
      expect(usage['markFinalized']).toHaveBeenCalledTimes(1);
    });

    it('is a no-op for a reservation another replica already settled', async () => {
      usage['markFinalized'].mockResolvedValue(0);
      await manager.finalize({
        reservationId: 'res-1',
        promptTokens: 1000,
        completionTokens: 2000,
        cachedPromptTokens: 0,
        reasoningTokens: 0,
        toolCalls: 0,
        searchCalls: 0,
      });
      expect(wallets['applySettlement']).not.toHaveBeenCalled();
    });

    it('ignores an unknown reservation instead of failing the request', async () => {
      usage['findByReservationId'].mockResolvedValue(null);
      await expect(
        manager.finalize({
          reservationId: 'missing',
          promptTokens: 1,
          completionTokens: 1,
          cachedPromptTokens: 0,
          reasoningTokens: 0,
          toolCalls: 0,
          searchCalls: 0,
        }),
      ).resolves.toEqual({ settled: false, billingMode: PaygBillingMode.UNKNOWN });
      // No reservation, no user: the billing mode is never even looked up.
      expect(billingModes['resolve']).not.toHaveBeenCalled();
    });
  });

  // F108: the settled cost rides back on finalize for a PAYG user ONLY. The
  // number is internal margin for everyone else, so each non-PAYG branch is
  // asserted to carry no cost key at all - not undefined, not zero, absent.
  describe('finalize outcome (F108)', () => {
    const FINALIZE_INPUT = {
      reservationId: 'res-1',
      promptTokens: 1000,
      completionTokens: 2000,
      cachedPromptTokens: 0,
      reasoningTokens: 0,
      toolCalls: 0,
      searchCalls: 0,
    };

    it('returns the charged amount in integer micro-USD for a PAYG user', async () => {
      const outcome = await manager.finalize(FINALIZE_INPUT);
      expect(outcome).toEqual({
        settled: true,
        billingMode: PaygBillingMode.PAYG,
        settledCostMicroUsd: 21_000,
      });
      expect(Number.isInteger(outcome.settledCostMicroUsd)).toBe(true);
      // Resolved for the reservation's owner, after the money moved.
      expect(billingModes['resolve']).toHaveBeenCalledWith('user-1');
    });

    it('discloses the CHARGE, not the priced cost, when the provider overran the hold', async () => {
      wallets['applySettlement'].mockResolvedValue({
        chargedMicroUsd: 50_000n,
        refundedMicroUsd: 0n,
        availableAfterMicroUsd: 0n,
        periodGrantMicroUsd: 300_000n,
      });
      const outcome = await manager.finalize({ ...FINALIZE_INPUT, completionTokens: 500_000 });
      expect(outcome.settledCostMicroUsd).toBe(50_000);
    });

    it('keeps a zero charge as zero for a PAYG user', async () => {
      wallets['applySettlement'].mockResolvedValue({
        chargedMicroUsd: 0n,
        refundedMicroUsd: 50_000n,
        availableAfterMicroUsd: 50_000n,
        periodGrantMicroUsd: 300_000n,
      });
      const outcome = await manager.finalize({
        ...FINALIZE_INPUT,
        promptTokens: 0,
        completionTokens: 0,
      });
      expect(outcome).toEqual({
        settled: true,
        billingMode: PaygBillingMode.PAYG,
        settledCostMicroUsd: 0,
      });
    });

    it.each([PaygBillingMode.SUBSCRIPTION, PaygBillingMode.UNKNOWN])(
      'omits the cost entirely for %s',
      async (mode) => {
        billingModes['resolve'].mockResolvedValue(mode);
        const outcome = await manager.finalize(FINALIZE_INPUT);
        expect(outcome).toEqual({ settled: true, billingMode: mode });
        expect(outcome).not.toHaveProperty('settledCostMicroUsd');
        // The money still moved: only the DISCLOSURE is withheld.
        expect(wallets['applySettlement']).toHaveBeenCalledTimes(1);
      },
    );

    it('never carries a provider rate, a margin or a priced cost beside the charge', async () => {
      const outcome = await manager.finalize(FINALIZE_INPUT);
      expect(Object.keys(outcome).sort()).toEqual([
        'billingMode',
        'settled',
        'settledCostMicroUsd',
      ]);
      expect(JSON.stringify(outcome)).not.toMatch(/rate|margin|provider|actual|ceiling/i);
    });

    it('withholds a charge that is not a safe integer instead of rounding it', async () => {
      wallets['applySettlement'].mockResolvedValue({
        chargedMicroUsd: BigInt(Number.MAX_SAFE_INTEGER) + 1n,
        refundedMicroUsd: 0n,
        availableAfterMicroUsd: 0n,
        periodGrantMicroUsd: 300_000n,
      });
      const outcome = await manager.finalize(FINALIZE_INPUT);
      expect(outcome.billingMode).toBe(PaygBillingMode.PAYG);
      expect(outcome).not.toHaveProperty('settledCostMicroUsd');
    });

    it('reports a replay as not settled, with no cost and no billing-mode lookup', async () => {
      usage['markFinalized'].mockResolvedValue(0);
      const outcome = await manager.finalize(FINALIZE_INPUT);
      expect(outcome).toEqual({ settled: false, billingMode: PaygBillingMode.UNKNOWN });
      expect(billingModes['resolve']).not.toHaveBeenCalled();
    });
  });

  describe('release', () => {
    it('gives the hold back', async () => {
      await manager.release('res-1', 'PROVIDER_ERROR');
      expect(wallets['applyRelease']).toHaveBeenCalledWith(
        expect.objectContaining({
          reservationId: 'res-1',
          held: { grantMicroUsd: 50_000n, purchasedMicroUsd: 0n },
        }),
      );
    });

    it('is a no-op on a DOUBLE release, not a double refund', async () => {
      usage['markReleased'].mockResolvedValueOnce(1).mockResolvedValueOnce(0);
      await manager.release('res-1', 'PROVIDER_ERROR');
      await manager.release('res-1', 'PROVIDER_ERROR');
      expect(wallets['applyRelease']).toHaveBeenCalledTimes(1);
    });

    it('ignores a reservation that was never PAYG', async () => {
      usage['findByReservationId'].mockResolvedValue(makeRecord({ isPayg: false }));
      await manager.release('res-1', 'CANCELLED');
      expect(wallets['applyRelease']).not.toHaveBeenCalled();
    });
  });
  // ADR-142: the plan's free requests on a credit connector. Credit is spent
  // FIRST; the allowance is only the fallback when credit cannot cover the call.
  describe('the free allowance fallback', () => {
    const UNLIMITED = { limit: null, requestCeilingMicroUsd: 150_000n };
    const EMPTY_WALLET = { wallet: makeWallet({ grantMicroUsd: 0n }), availableMicroUsd: 0n };
    const ADMISSION = {
      counter: { userId: 'user-1', provider: 'OPENAI', periodKey: '2026-08' },
      maxOutputTokens: 14_900,
      clamped: true,
      worstCaseCostMicroUsd: 150_000n,
    };

    beforeEach(() => {
      grants['ensureCurrentPeriod'].mockResolvedValue(EMPTY_WALLET);
      // An UNLIMITED allowance (null) stays credit-first: only a capped one is
      // counted ahead of the wallet (see the capped describe below).
      freeAllowance.resolvePolicy.mockResolvedValue(UNLIMITED);
      freeAllowance.tryAdmit.mockResolvedValue({ status: 'ADMITTED', admission: ADMISSION });
    });

    it('admits an empty wallet on the allowance: no hold, a zero-amount ledger trace', async () => {
      const outcome = await manager.reserve(makeInput());

      expect(outcome).toEqual({
        metered: true,
        reservationId: expect.any(String),
        maxOutputTokens: 14_900,
        clamped: true,
        heldMicroUsd: 0,
        availableAfterMicroUsd: 0,
        freeAllowance: true,
      });
      expect(wallets['applyHold']).not.toHaveBeenCalled();
      expect(client.eval).not.toHaveBeenCalled();
      expect(wallets['recordFreeAllowance']).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          provider: 'OPENAI',
          model: 'gpt-5',
          surface: PaygSurface.CHAT,
          reason: 'FREE_ALLOWANCE_USED',
        }),
      );
    });

    it('writes the usage row flagged as an allowance call, holding nothing', async () => {
      await manager.reserve(makeInput());

      const [{ input }] = usage['createReservation'].mock.calls[0] as [
        {
          input: {
            isFreeAllowance: boolean;
            isPayg: boolean;
            creditGrantMicroUsd: bigint;
            creditPurchasedMicroUsd: bigint;
            estimatedCostMicroUsd: bigint;
          };
        },
      ];
      expect(input.isFreeAllowance).toBe(true);
      expect(input.isPayg).toBe(true);
      expect(input.creditGrantMicroUsd).toBe(0n);
      expect(input.creditPurchasedMicroUsd).toBe(0n);
      // The absorbed worst case, so plan cost aggregates still see the spend.
      expect(input.estimatedCostMicroUsd).toBe(150_000n);
    });

    it('CREDIT FIRST: a user whose wallet can pay is charged and never touches the allowance', async () => {
      grants['ensureCurrentPeriod'].mockResolvedValue({
        wallet: makeWallet(),
        availableMicroUsd: 50_000n,
      });

      const outcome = await manager.reserve(makeInput());

      expect(outcome).toMatchObject({ metered: true, heldMicroUsd: 50_000 });
      expect(outcome).not.toHaveProperty('freeAllowance');
      expect(freeAllowance.tryAdmit).not.toHaveBeenCalled();
      expect(wallets['applyHold']).toHaveBeenCalledTimes(1);
    });

    it('falls back when credit cannot cover the prompt (too little, not zero)', async () => {
      grants['ensureCurrentPeriod'].mockResolvedValue({
        wallet: makeWallet({ grantMicroUsd: 100n }),
        availableMicroUsd: 100n,
      });

      await expect(manager.reserve(makeInput({ promptTokens: 5000 }))).resolves.toMatchObject({
        freeAllowance: true,
      });
      expect(wallets['applyHold']).not.toHaveBeenCalled();
    });

    it('falls back when a concurrent request took the credit (the atomic step refused)', async () => {
      grants['ensureCurrentPeriod'].mockResolvedValue({
        wallet: makeWallet(),
        availableMicroUsd: 50_000n,
      });
      client.eval.mockResolvedValue([0, 'CREDIT_GRANT', '50000', '50000']);

      await expect(manager.reserve(makeInput())).resolves.toMatchObject({ freeAllowance: true });
    });

    it('an unlimited allowance that cannot admit reads like an empty wallet: 402 PAYG_CREDIT_EXHAUSTED', async () => {
      freeAllowance.tryAdmit.mockResolvedValue({ status: 'PROMPT_TOO_LARGE' });

      await expect(manager.reserve(makeInput())).rejects.toMatchObject({
        code: BillingErrorCode.PAYG_CREDIT_EXHAUSTED,
      });
      expect(usage['createReservation']).not.toHaveBeenCalled();
      expect(wallets['recordFreeAllowance']).not.toHaveBeenCalled();
    });

    it('keeps PAYG_PROMPT_TOO_EXPENSIVE when the user HAS credit the prompt outgrew', async () => {
      grants['ensureCurrentPeriod'].mockResolvedValue({
        wallet: makeWallet({ grantMicroUsd: 100n }),
        availableMicroUsd: 100n,
      });
      freeAllowance.tryAdmit.mockResolvedValue({ status: 'PROMPT_TOO_LARGE' });

      await expect(manager.reserve(makeInput({ promptTokens: 5000 }))).rejects.toMatchObject({
        code: BillingErrorCode.PAYG_PROMPT_TOO_EXPENSIVE,
      });
    });

    it('does not mask a real failure: a database error is not a credit refusal', async () => {
      grants['ensureCurrentPeriod'].mockResolvedValue({
        wallet: makeWallet(),
        availableMicroUsd: 50_000n,
      });
      usage['createReservation'].mockRejectedValue(new Error('db down'));

      await expect(manager.reserve(makeInput())).rejects.toThrow('db down');
      expect(freeAllowance.tryAdmit).not.toHaveBeenCalled();
    });

    it('gives the counter slot back when the durable write fails', async () => {
      usage['createReservation'].mockRejectedValue(new Error('db down'));

      await expect(manager.reserve(makeInput())).rejects.toThrow('db down');

      expect(freeAllowance.giveBack).toHaveBeenCalledWith(ADMISSION.counter);
      expect(usage['deleteByReservationId']).toHaveBeenCalledTimes(1);
    });

    it('gives the counter slot back when the ledger trace cannot be written', async () => {
      wallets['recordFreeAllowance'].mockRejectedValue(new Error('ledger down'));

      await expect(manager.reserve(makeInput())).rejects.toThrow('ledger down');

      expect(freeAllowance.giveBack).toHaveBeenCalledWith(ADMISSION.counter);
    });

    it('a retried request reuses its allowance hold instead of taking a second slot', async () => {
      usage['findOpenPaygReservation'].mockResolvedValue(
        makeRecord({
          isFreeAllowance: true,
          creditGrantMicroUsd: 0n,
          creditPurchasedMicroUsd: 0n,
        }),
      );

      const outcome = await manager.reserve(makeInput({ requestedMaxOutputTokens: 800 }));

      expect(outcome).toEqual({
        metered: true,
        reservationId: 'res-1',
        maxOutputTokens: 800,
        clamped: false,
        heldMicroUsd: 0,
        availableAfterMicroUsd: 0,
        freeAllowance: true,
      });
      expect(freeAllowance.tryAdmit).not.toHaveBeenCalled();
    });

    it('does not consult the allowance for an unmetered request', async () => {
      policy['getPolicy'].mockResolvedValue({ OPENAI: false });

      await manager.reserve(makeInput());

      expect(freeAllowance.tryAdmit).not.toHaveBeenCalled();
    });

    describe('finalize', () => {
      const allowanceRecord = (): ReturnType<typeof makeRecord> =>
        makeRecord({
          isFreeAllowance: true,
          creditGrantMicroUsd: 0n,
          creditPurchasedMicroUsd: 0n,
          estimatedCostMicroUsd: 150_000n,
        });
      const usageReport = {
        reservationId: 'res-1',
        promptTokens: 1000,
        completionTokens: 500,
        cachedPromptTokens: 0,
        reasoningTokens: 0,
        toolCalls: 0,
        searchCalls: 0,
      };

      // F108: what the PLATFORM paid for an absorbed call is never shown to the
      // user, even a PAYG one, and it never reaches the billing-mode lookup.
      it('discloses no cost for an absorbed call (F108)', async () => {
        usage['findByReservationId'].mockResolvedValue(allowanceRecord());

        const outcome = await manager.finalize(usageReport);

        expect(outcome).toEqual({ settled: true, billingMode: PaygBillingMode.UNKNOWN });
        expect(outcome).not.toHaveProperty('settledCostMicroUsd');
        expect(billingModes['resolve']).not.toHaveBeenCalled();
      });

      it('moves no money: no settlement, no counter change', async () => {
        usage['findByReservationId'].mockResolvedValue(allowanceRecord());

        await manager.finalize(usageReport);

        expect(usage['markFinalized']).toHaveBeenCalledTimes(1);
        expect(wallets['applySettlement']).not.toHaveBeenCalled();
        expect(freeAllowance.giveBack).not.toHaveBeenCalled();
        expect(events['publishBalanceState']).not.toHaveBeenCalled();
      });

      it('records what the platform actually paid on the row', async () => {
        usage['findByReservationId'].mockResolvedValue(allowanceRecord());

        await manager.finalize(usageReport);

        // 1000 in at $1/M plus 500 out at $10/M.
        expect(usage['markFinalized']).toHaveBeenCalledWith(
          expect.objectContaining({ actualCostMicroUsd: 6_000n }),
        );
      });

      it('records the admission estimate, never zero, when the price lookup fails', async () => {
        usage['findByReservationId'].mockResolvedValue(allowanceRecord());
        rates['findRate'].mockResolvedValue(null);

        await manager.finalize(usageReport);

        expect(usage['markFinalized']).toHaveBeenCalledWith(
          expect.objectContaining({ actualCostMicroUsd: 150_000n }),
        );
      });
    });

    describe('release', () => {
      const allowanceRecord = (): ReturnType<typeof makeRecord> =>
        makeRecord({
          isFreeAllowance: true,
          creditGrantMicroUsd: 0n,
          creditPurchasedMicroUsd: 0n,
          monthKey: '2026-08',
        });

      it('gives the slot back on the month it was taken in and writes a compensating row', async () => {
        usage['findByReservationId'].mockResolvedValue(allowanceRecord());

        await manager.release('res-1', 'PROVIDER_ERROR');

        expect(freeAllowance.giveBack).toHaveBeenCalledWith({
          userId: 'user-1',
          provider: 'OPENAI',
          periodKey: '2026-08',
        });
        expect(wallets['recordFreeAllowance']).toHaveBeenCalledWith(
          expect.objectContaining({ reason: 'FREE_ALLOWANCE_RETURNED:PROVIDER_ERROR' }),
        );
        expect(wallets['applyRelease']).not.toHaveBeenCalled();
      });

      it('returns the slot ONCE: a double release is a no-op', async () => {
        usage['findByReservationId'].mockResolvedValue(allowanceRecord());
        usage['markReleased'].mockResolvedValueOnce(1).mockResolvedValueOnce(0);

        await manager.release('res-1', 'CANCELLED');
        await manager.release('res-1', 'CANCELLED');

        expect(freeAllowance.giveBack).toHaveBeenCalledTimes(1);
        expect(wallets['recordFreeAllowance']).toHaveBeenCalledTimes(1);
      });

      it('touches no Redis hold counter: nothing was held', async () => {
        usage['findByReservationId'].mockResolvedValue(allowanceRecord());

        await manager.release('res-1', 'TIMEOUT');

        expect(client.eval).not.toHaveBeenCalled();
      });
    });
  });

  // Owner decision 2026-10-02 (ADR-142 update): a plan with a finite allowance
  // counts EVERY credit-connector request ahead of the wallet and refuses N+1 with
  // PAYG_FREE_ALLOWANCE_EXHAUSTED, grant or no grant; purchased credit bypasses
  // the cap; the cap holds with the metering kill switch OFF.
  describe('the capped free allowance (N requests a month, one total)', () => {
    const cappedPolicy = (limit: number) => ({ limit, requestCeilingMicroUsd: 60_000n });
    const ADMISSION = {
      counter: { userId: 'user-1', provider: '*', periodKey: '2026-08' },
      maxOutputTokens: 14_900,
      clamped: true,
      worstCaseCostMicroUsd: 60_000n,
    };
    const GRANT_WALLET = { wallet: makeWallet(), availableMicroUsd: 50_000n };

    /** An in-memory stand-in for the guarded counter: ADMITTED while below the limit. */
    const useCounter = (limit: number): { used: () => number } => {
      let used = 0;
      freeAllowance.resolvePolicy.mockResolvedValue(cappedPolicy(limit));
      freeAllowance.tryAdmit.mockImplementation(async () => {
        if (used >= limit) {
          return { status: 'SPENT', limit };
        }
        used += 1;
        return { status: 'ADMITTED', admission: ADMISSION };
      });
      return { used: () => used };
    };

    beforeEach(() => {
      freeAllowance.resolvePolicy.mockResolvedValue(cappedPolicy(5));
      freeAllowance.tryAdmit.mockResolvedValue({ status: 'ADMITTED', admission: ADMISSION });
    });

    it('counts a grant-funded user first: the request is a free request, nothing is held', async () => {
      grants['ensureCurrentPeriod'].mockResolvedValue(GRANT_WALLET);

      const outcome = await manager.reserve(makeInput());

      expect(outcome).toMatchObject({ metered: true, freeAllowance: true, heldMicroUsd: 0 });
      expect(freeAllowance.tryAdmit).toHaveBeenCalledTimes(1);
      expect(wallets['applyHold']).not.toHaveBeenCalled();
      expect(client.eval).not.toHaveBeenCalled();
    });

    it('refuses with PAYG_FREE_ALLOWANCE_EXHAUSTED once the cap is spent, even with a grant that could pay', async () => {
      grants['ensureCurrentPeriod'].mockResolvedValue(GRANT_WALLET);
      freeAllowance.tryAdmit.mockResolvedValue({ status: 'SPENT', limit: 5 });

      await expect(manager.reserve(makeInput())).rejects.toMatchObject({
        code: BillingErrorCode.PAYG_FREE_ALLOWANCE_EXHAUSTED,
      });
      expect(wallets['applyHold']).not.toHaveBeenCalled();
      expect(usage['createReservation']).not.toHaveBeenCalled();
    });

    it.each([5, 15])(
      'a plan of %i admits exactly that many requests and refuses the next',
      async (limit) => {
        const counter = useCounter(limit);
        grants['ensureCurrentPeriod'].mockResolvedValue(GRANT_WALLET);

        for (let i = 0; i < limit; i += 1) {
          await expect(
            manager.reserve(makeInput({ requestId: `req-${i}` })),
          ).resolves.toMatchObject({
            freeAllowance: true,
          });
        }
        await expect(manager.reserve(makeInput({ requestId: 'req-over' }))).rejects.toMatchObject({
          code: BillingErrorCode.PAYG_FREE_ALLOWANCE_EXHAUSTED,
        });
        expect(counter.used()).toBe(limit);
      },
    );

    it('is ONE total: requests on different providers draw from the same count', async () => {
      const counter = useCounter(5);
      policy['getPolicy'].mockResolvedValue({ OPENAI: true, ANTHROPIC: true, GROK: true });
      grants['ensureCurrentPeriod'].mockResolvedValue(GRANT_WALLET);
      const providers = ['OPENAI', 'ANTHROPIC', 'GROK'];

      const results = await Promise.allSettled(
        Array.from({ length: 8 }, (_, i) =>
          manager.reserve(
            makeInput({
              requestId: `req-${i}`,
              provider: providers[i % providers.length] ?? 'GROK',
            }),
          ),
        ),
      );

      expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(5);
      expect(counter.used()).toBe(5);
    });

    it('PURCHASED credit bypasses the cap: charged from the wallet, the counter untouched', async () => {
      grants['ensureCurrentPeriod'].mockResolvedValue({
        wallet: makeWallet({ purchasedMicroUsd: 40_000n }),
        availableMicroUsd: 90_000n,
      });
      freeAllowance.tryAdmit.mockResolvedValue({ status: 'SPENT', limit: 5 });

      const outcome = await manager.reserve(makeInput());

      expect(outcome).toMatchObject({ metered: true });
      expect(outcome).not.toHaveProperty('freeAllowance');
      expect(freeAllowance.tryAdmit).not.toHaveBeenCalled();
      expect(wallets['applyHold']).toHaveBeenCalledTimes(1);
    });

    it('a prompt the per-request ceiling cannot pay is PAYG_PROMPT_TOO_EXPENSIVE, not a spent cap', async () => {
      grants['ensureCurrentPeriod'].mockResolvedValue(GRANT_WALLET);
      freeAllowance.tryAdmit.mockResolvedValue({ status: 'PROMPT_TOO_LARGE' });

      await expect(manager.reserve(makeInput())).rejects.toMatchObject({
        code: BillingErrorCode.PAYG_PROMPT_TOO_EXPENSIVE,
      });
    });

    it('a per-unit surface is not counted: the wallet decides it as before', async () => {
      grants['ensureCurrentPeriod'].mockResolvedValue(GRANT_WALLET);
      freeAllowance.tryAdmit.mockResolvedValue({ status: 'INELIGIBLE' });

      const outcome = await manager.reserve(
        makeInput({ surface: PaygSurface.IMAGE, imageUnits: 1 }),
      );

      expect(outcome).toMatchObject({ metered: true });
      expect(outcome).not.toHaveProperty('freeAllowance');
    });

    it('a request that fails gives its slot back so it does not count', async () => {
      usage['findByReservationId'].mockResolvedValue(
        makeRecord({
          isFreeAllowance: true,
          creditGrantMicroUsd: 0n,
          creditPurchasedMicroUsd: 0n,
          monthKey: '2026-08',
        }),
      );

      await manager.release('res-1', 'PROVIDER_ERROR');

      expect(freeAllowance.giveBack).toHaveBeenCalledWith({
        userId: 'user-1',
        provider: 'OPENAI',
        periodKey: '2026-08',
      });
    });

    describe('with the metering kill switch OFF (production never had the row)', () => {
      beforeEach(() => {
        settings['isEnabled'].mockResolvedValue(false);
      });

      it('still counts a capped plan, and prices and holds nothing', async () => {
        const outcome = await manager.reserve(makeInput());

        expect(outcome).toMatchObject({ metered: true, freeAllowance: true, heldMicroUsd: 0 });
        expect(freeAllowance.tryAdmit).toHaveBeenCalledWith(
          expect.objectContaining({ provider: 'OPENAI' }),
          null,
          cappedPolicy(5),
          expect.any(Date),
        );
        expect(rates['findRate']).not.toHaveBeenCalled();
        expect(grants['ensureCurrentPeriod']).not.toHaveBeenCalled();
        expect(wallets['applyHold']).not.toHaveBeenCalled();
      });

      it.each([5, 15])('stops at exactly %i requests', async (limit) => {
        useCounter(limit);

        for (let i = 0; i < limit; i += 1) {
          await manager.reserve(makeInput({ requestId: `req-${i}` }));
        }
        await expect(manager.reserve(makeInput({ requestId: 'req-over' }))).rejects.toMatchObject({
          code: BillingErrorCode.PAYG_FREE_ALLOWANCE_EXHAUSTED,
        });
      });

      it('leaves a paid plan (no allowance policy) unmetered exactly as before', async () => {
        freeAllowance.resolvePolicy.mockResolvedValue(null);

        await expect(manager.reserve(makeInput())).resolves.toEqual({
          metered: false,
          reason: 'METERING_DISABLED',
          maxOutputTokens: DEFAULT_MAX_OUTPUT,
        });
        expect(freeAllowance.tryAdmit).not.toHaveBeenCalled();
      });

      it('leaves an UNLIMITED allowance unmetered: there is no number to stop at', async () => {
        freeAllowance.resolvePolicy.mockResolvedValue({ limit: null, requestCeilingMicroUsd: 1n });

        await expect(manager.reserve(makeInput())).resolves.toMatchObject({ metered: false });
        expect(freeAllowance.tryAdmit).not.toHaveBeenCalled();
      });

      it('never counts a local provider', async () => {
        await expect(manager.reserve(makeInput({ provider: 'OLLAMA' }))).resolves.toMatchObject({
          metered: false,
        });
        expect(freeAllowance.tryAdmit).not.toHaveBeenCalled();
      });

      it('never counts a provider the connector policy does not meter', async () => {
        policy['getPolicy'].mockResolvedValue({ OPENAI: false });

        await expect(manager.reserve(makeInput())).resolves.toMatchObject({ metered: false });
        expect(freeAllowance.tryAdmit).not.toHaveBeenCalled();
      });

      it('never counts an administrator', async () => {
        users['findUserById'].mockResolvedValue({ id: 'admin-1', role: UserRole.ADMIN });

        await expect(manager.reserve(makeInput())).resolves.toMatchObject({ metered: false });
        expect(freeAllowance.tryAdmit).not.toHaveBeenCalled();
      });

      it('counts coding-agent turns and stops them at the cap', async () => {
        useCounter(2);

        for (let i = 0; i < 2; i += 1) {
          await manager.reserve(
            makeInput({ surface: PaygSurface.CODING_AGENT, requestId: `a-${i}` }),
          );
        }
        await expect(
          manager.reserve(makeInput({ surface: PaygSurface.CODING_AGENT, requestId: 'a-over' })),
        ).rejects.toMatchObject({ code: BillingErrorCode.PAYG_FREE_ALLOWANCE_EXHAUSTED });
      });

      it('never counts a per-unit surface', async () => {
        await expect(
          manager.reserve(makeInput({ surface: PaygSurface.VIDEO, videoSeconds: 8 })),
        ).resolves.toMatchObject({ metered: false });
        expect(freeAllowance.tryAdmit).not.toHaveBeenCalled();
      });

      it('a retried request reuses its slot instead of taking a second one', async () => {
        usage['findOpenPaygReservation'].mockResolvedValue(
          makeRecord({
            isFreeAllowance: true,
            creditGrantMicroUsd: 0n,
            creditPurchasedMicroUsd: 0n,
          }),
        );

        await expect(manager.reserve(makeInput())).resolves.toMatchObject({ freeAllowance: true });
        expect(freeAllowance.tryAdmit).not.toHaveBeenCalled();
      });
    });
  });
});
