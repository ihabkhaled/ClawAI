import { BillingErrorCode, ModelCostClass, PaygSurface, UserRole } from '@claw/shared-types';

import { type RedisService } from '../../../../infrastructure/redis/redis.service';
import { type AuthRepository } from '../../../auth/repositories/auth.repository';
import { type WeightedUsageRepository } from '../../../quota/repositories/weighted-usage.repository';
import { type SystemSettingService } from '../../../system-settings/services/system-setting.service';
import { type ConnectorPolicyClient } from '../../clients/connector-policy.client';
import { type ModelRateClient } from '../../clients/model-rate.client';
import { type CreditLedgerRepository } from '../../repositories/credit-ledger.repository';
import { type CreditEventService } from '../../services/credit-event.service';
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
  rawReasoningTokens: 0,
  rawOutputTokens: 0,
  toolCallCount: 0,
  isPayg: true,
  creditGrantMicroUsd: 50_000n,
  creditPurchasedMicroUsd: 0n,
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
  let client: { eval: jest.Mock; mget: jest.Mock };
  let redis: { getClient: jest.Mock };
  let wallets: {
    ensure: jest.Mock;
    getBalances: jest.Mock;
    applyHold: jest.Mock;
    applyRelease: jest.Mock;
    applySettlement: jest.Mock;
  };
  let grants: { ensureCurrentPeriod: jest.Mock };
  let rates: { findRate: jest.Mock; invalidate: jest.Mock };
  let policy: { getPolicy: jest.Mock };
  let settings: { isEnabled: jest.Mock };
  let usage: {
    findOpenPaygReservation: jest.Mock;
    createReservation: jest.Mock;
    findByReservationId: jest.Mock;
    markFinalized: jest.Mock;
    markReleased: jest.Mock;
    deleteByReservationId: jest.Mock;
  };
  let users: { findUserById: jest.Mock };
  let events: { publishBalanceState: jest.Mock };
  let ledger: { findReservationAttribution: jest.Mock };
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
    );

  beforeEach(() => {
    client = {
      eval: jest.fn().mockResolvedValue([1, '', '0', '0']),
      mget: jest.fn().mockResolvedValue([null, null]),
    };
    redis = { getClient: jest.fn().mockReturnValue(client) };
    wallets = {
      ensure: jest.fn().mockResolvedValue(makeWallet()),
      getBalances: jest.fn().mockResolvedValue({
        wallet: makeWallet(),
        availableMicroUsd: 50_000n,
      }),
      applyHold: jest.fn().mockResolvedValue(makeWallet()),
      applyRelease: jest.fn().mockResolvedValue(makeWallet()),
      applySettlement: jest.fn().mockResolvedValue({
        chargedMicroUsd: 21_000n,
        refundedMicroUsd: 29_000n,
        availableAfterMicroUsd: 29_000n,
        periodGrantMicroUsd: 300_000n,
      }),
    };
    grants = {
      ensureCurrentPeriod: jest.fn().mockResolvedValue({
        wallet: makeWallet(),
        availableMicroUsd: 50_000n,
      }),
    };
    rates = { findRate: jest.fn().mockResolvedValue(PRICED_RATE), invalidate: jest.fn() };
    policy = { getPolicy: jest.fn().mockResolvedValue({ OPENAI: true }) };
    settings = { isEnabled: jest.fn().mockResolvedValue(true) };
    usage = {
      findOpenPaygReservation: jest.fn().mockResolvedValue(null),
      createReservation: jest.fn().mockResolvedValue(makeRecord()),
      findByReservationId: jest.fn().mockResolvedValue(makeRecord()),
      markFinalized: jest.fn().mockResolvedValue(1),
      markReleased: jest.fn().mockResolvedValue(1),
      deleteByReservationId: jest.fn().mockResolvedValue(undefined),
    };
    users = { findUserById: jest.fn().mockResolvedValue({ id: 'user-1', role: UserRole.USER }) };
    events = { publishBalanceState: jest.fn().mockResolvedValue(undefined) };
    ledger = {
      findReservationAttribution: jest
        .fn()
        .mockResolvedValue({ surface: PaygSurface.CHAT, workflow: null }),
    };
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
      const held = wallets['applyHold'].mock.calls[0][0].split;
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
      ).resolves.toBeUndefined();
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
});
