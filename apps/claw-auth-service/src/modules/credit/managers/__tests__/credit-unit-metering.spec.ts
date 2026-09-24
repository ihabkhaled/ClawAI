import { Test } from '@nestjs/testing';
import { type Mock, vi } from 'vitest';
import { ModelCostClass, type ModelCostRates, PaygSurface, UserRole } from '@claw/shared-types';

import {
  CreditLedgerKind,
  type UserCreditWallet,
  type WeightedUsageRecord,
  WeightedUsageState,
} from '../../../../generated/prisma';
import { RedisService } from '../../../../infrastructure/redis/redis.service';
import { AuthRepository } from '../../../auth/repositories/auth.repository';
import { WeightedUsageRepository } from '../../../quota/repositories/weighted-usage.repository';
import { SystemSettingService } from '../../../system-settings/services/system-setting.service';
import { ConnectorPolicyClient } from '../../clients/connector-policy.client';
import { ModelRateClient } from '../../clients/model-rate.client';
import { CreditLedgerRepository } from '../../repositories/credit-ledger.repository';
import { CreditWalletRepository } from '../../repositories/credit-wallet.repository';
import { CreditEventService } from '../../services/credit-event.service';
import { CreditGrantService } from '../../services/credit-grant.service';
import { CreditWalletService } from '../../services/credit-wallet.service';
import {
  type CreditLedgerDraft,
  type CreditMovementStep,
  type CreditReserveInput,
  type PaygRateSnapshot,
} from '../../types/credit.types';
import { CreditReservationManager } from '../credit-reservation.manager';

// Unit metering end to end through the REAL reservation manager and the REAL
// wallet service, over an in-memory wallet + ledger. The property under test is
// the one that was broken: an OpenAI image reports no token usage, so before
// unit metering it reserved against tokens and settled at $0 — a RESERVATION
// row, then a CONSUMPTION row of zero, then the whole hold handed back.

// gpt-image-1, high quality, 1024x1024: $0.167 per image. Token rates carry
// only the text prompt; the image itself is priced per unit so it is never
// counted twice.
const GPT_IMAGE_RATE: PaygRateSnapshot = {
  rates: rates({
    model: 'gpt-image-1',
    inputPerMillionMicroUsd: 5_000_000,
    outputPerMillionMicroUsd: 0,
    imagePerUnitMicroUsd: 167_000,
    costClass: ModelCostClass.PREMIUM,
  }),
  isPriced: true,
  isLocalComputeFallback: false,
};

// Gemini images are token-metered: no per-unit rate, $30/M output.
const GEMINI_IMAGE_RATE: PaygRateSnapshot = {
  rates: rates({
    provider: 'GEMINI',
    model: 'gemini-2.5-flash-image',
    inputPerMillionMicroUsd: 300_000,
    outputPerMillionMicroUsd: 30_000_000,
  }),
  isPriced: true,
  isLocalComputeFallback: false,
};

function rates(overrides: Partial<ModelCostRates>): ModelCostRates {
  return {
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
    effectiveFrom: '2026-09-25T00:00:00.000Z',
    lastVerifiedAt: null,
    source: 'SEED',
    ...overrides,
  };
}

const BALANCE = 1_000_000n; // $1.00 of plan grant

type BigIntWalletField =
  'grantMicroUsd' | 'purchasedMicroUsd' | 'reservedMicroUsd' | 'lifetimeConsumedMicroUsd';

const MOVED_FIELDS: readonly BigIntWalletField[] = [
  'grantMicroUsd',
  'purchasedMicroUsd',
  'reservedMicroUsd',
  'lifetimeConsumedMicroUsd',
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** An in-memory wallet row + ledger that applies increment/decrement for real. */
class FakeWalletStore {
  readonly ledger: CreditLedgerDraft[] = [];
  wallet: UserCreditWallet = {
    id: 'wallet-1',
    userId: 'user-1',
    grantMicroUsd: BALANCE,
    purchasedMicroUsd: 0n,
    reservedMicroUsd: 0n,
    periodGrantMicroUsd: BALANCE,
    periodKey: '2026-09',
    grantResetsAt: new Date('2026-10-01T00:00:00.000Z'),
    lifetimeGrantedMicroUsd: BALANCE,
    lifetimePurchasedMicroUsd: 0n,
    lifetimeConsumedMicroUsd: 0n,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  ensure = vi.fn(() => Promise.resolve(this.wallet));

  applyMovements = vi.fn((_walletId: string, steps: readonly CreditMovementStep[]) => {
    for (const step of steps) {
      const update: unknown = step.walletUpdate;
      for (const field of MOVED_FIELDS) {
        const operation: unknown = isRecord(update) ? update[field] : undefined;
        if (!isRecord(operation)) {
          continue;
        }
        const increment = operation['increment'];
        const decrement = operation['decrement'];
        if (typeof increment === 'bigint') {
          this.wallet = { ...this.wallet, [field]: this.wallet[field] + increment };
        }
        if (typeof decrement === 'bigint') {
          this.wallet = { ...this.wallet, [field]: this.wallet[field] - decrement };
        }
      }
      this.ledger.push(step.ledger);
    }
    return Promise.resolve(this.wallet);
  });
}

function usageRecord(overrides: Partial<WeightedUsageRecord>): WeightedUsageRecord {
  return {
    id: 'row-1',
    userId: 'user-1',
    planId: null,
    subscriptionId: null,
    reservationId: 'res-1',
    requestId: 'gen-1',
    provider: 'OPENAI',
    model: 'gpt-image-1',
    workflow: null,
    rawInputTokens: 0,
    rawCachedTokens: 0,
    rawReasoningTokens: 0,
    rawOutputTokens: 0,
    toolCallCount: 0,
    isPayg: true,
    creditGrantMicroUsd: 0n,
    creditPurchasedMicroUsd: 0n,
    weightedTokens: 0,
    estimatedCostMicroUsd: 0n,
    actualCostMicroUsd: null,
    currency: 'USD',
    state: WeightedUsageState.RESERVED,
    dayKey: '2026-09-25',
    weekKey: '2026-W39',
    monthKey: '2026-09',
    billingPeriodKey: null,
    createdAt: new Date(),
    finalizedAt: null,
    ...overrides,
  };
}

function imageReserve(overrides: Partial<CreditReserveInput> = {}): CreditReserveInput {
  return {
    userId: 'user-1',
    requestId: 'gen-1',
    provider: 'OPENAI',
    model: 'gpt-image-1',
    surface: PaygSurface.IMAGE,
    workflow: null,
    promptTokens: 0,
    cachedPromptTokens: 0,
    requestedMaxOutputTokens: 8192,
    imageUnits: 1,
    ...overrides,
  };
}

describe('CreditReservationManager — unit metering', () => {
  let store: FakeWalletStore;
  let findRate: Mock;
  let held: WeightedUsageRecord | null;
  let manager: CreditReservationManager;

  beforeEach(async () => {
    store = new FakeWalletStore();
    findRate = vi.fn().mockResolvedValue(GPT_IMAGE_RATE);
    held = null;

    const usage = {
      findOpenPaygReservation: vi.fn().mockResolvedValue(null),
      createReservation: vi.fn(
        (params: {
          reservationId: string;
          input: { creditGrantMicroUsd: bigint; creditPurchasedMicroUsd: bigint };
        }) => {
          held = usageRecord({
            reservationId: params.reservationId,
            creditGrantMicroUsd: params.input.creditGrantMicroUsd,
            creditPurchasedMicroUsd: params.input.creditPurchasedMicroUsd,
          });
          return Promise.resolve(held);
        },
      ),
      findByReservationId: vi.fn(() => Promise.resolve(held)),
      markFinalized: vi.fn().mockResolvedValue(1),
      markReleased: vi.fn().mockResolvedValue(1),
      deleteByReservationId: vi.fn().mockResolvedValue(undefined),
    };

    const module = await Test.createTestingModule({
      providers: [
        CreditReservationManager,
        CreditWalletService,
        { provide: CreditWalletRepository, useValue: store },
        {
          provide: RedisService,
          useValue: {
            getClient: () => ({
              eval: vi.fn().mockResolvedValue([1, '', '0', '0']),
              mget: vi.fn().mockResolvedValue([null, null]),
            }),
          },
        },
        {
          provide: CreditGrantService,
          useValue: {
            ensureCurrentPeriod: vi.fn(() =>
              Promise.resolve({ wallet: store.wallet, availableMicroUsd: BALANCE }),
            ),
          },
        },
        { provide: ModelRateClient, useValue: { findRate } },
        {
          provide: ConnectorPolicyClient,
          useValue: { getPolicy: vi.fn().mockResolvedValue({ OPENAI: true, GEMINI: true }) },
        },
        { provide: SystemSettingService, useValue: { isEnabled: vi.fn().mockResolvedValue(true) } },
        { provide: WeightedUsageRepository, useValue: usage },
        {
          provide: AuthRepository,
          useValue: {
            findUserById: vi.fn().mockResolvedValue({ id: 'user-1', role: UserRole.USER }),
          },
        },
        {
          provide: CreditEventService,
          useValue: { publishBalanceState: vi.fn().mockResolvedValue(undefined) },
        },
        {
          provide: CreditLedgerRepository,
          useValue: {
            findReservationAttribution: vi
              .fn()
              .mockResolvedValue({ surface: PaygSurface.IMAGE, workflow: null }),
          },
        },
      ],
    }).compile();

    manager = module.get(CreditReservationManager);
  });

  it('holds the per-image price at reserve, sized on the expected image count', async () => {
    const outcome = await manager.reserve(imageReserve());

    expect(outcome).toMatchObject({ metered: true, heldMicroUsd: 167_000, clamped: false });
    expect(store.ledger).toHaveLength(1);
    expect(store.ledger[0]).toMatchObject({
      kind: CreditLedgerKind.RESERVATION,
      amountMicroUsd: -167_000n,
    });
  });

  it('sizes the hold on imageUnits — two images hold twice the price', async () => {
    await manager.reserve(imageReserve({ imageUnits: 2 }));

    expect(store.ledger[0]).toMatchObject({ amountMicroUsd: -334_000n });
  });

  it('writes RESERVATION then a NON-ZERO CONSUMPTION for an OpenAI image (surface IMAGE)', async () => {
    const outcome = await manager.reserve(imageReserve());
    if (!outcome.metered) {
      throw new Error('expected a metered hold');
    }

    await manager.finalize({
      reservationId: outcome.reservationId,
      promptTokens: 0,
      completionTokens: 0,
      cachedPromptTokens: 0,
      reasoningTokens: 0,
      toolCalls: 0,
      searchCalls: 0,
      imageUnits: 1,
    });

    const kinds = store.ledger.map((row) => row.kind);
    expect(kinds[0]).toBe(CreditLedgerKind.RESERVATION);
    const consumption = store.ledger.find((row) => row.kind === CreditLedgerKind.CONSUMPTION);
    expect(consumption).toMatchObject({
      amountMicroUsd: -167_000n,
      surface: PaygSurface.IMAGE,
      provider: 'OPENAI',
      model: 'gpt-image-1',
    });
    expect(store.wallet.grantMicroUsd).toBe(BALANCE - 167_000n);
    expect(store.wallet.reservedMicroUsd).toBe(0n);
    expect(store.wallet.lifetimeConsumedMicroUsd).toBe(167_000n);
  });

  it('settles at zero when the provider returned no image (0 measured units)', async () => {
    const outcome = await manager.reserve(imageReserve());
    if (!outcome.metered) {
      throw new Error('expected a metered hold');
    }

    await manager.finalize({
      reservationId: outcome.reservationId,
      promptTokens: 0,
      completionTokens: 0,
      cachedPromptTokens: 0,
      reasoningTokens: 0,
      toolCalls: 0,
      searchCalls: 0,
      imageUnits: 0,
    });

    expect(store.wallet.grantMicroUsd).toBe(BALANCE);
    expect(store.wallet.reservedMicroUsd).toBe(0n);
  });

  it('releases exactly once when the provider throws', async () => {
    const outcome = await manager.reserve(imageReserve());
    if (!outcome.metered) {
      throw new Error('expected a metered hold');
    }

    await manager.release(outcome.reservationId, 'PROVIDER_ERROR');

    const releases = store.ledger.filter(
      (row) => row.kind === CreditLedgerKind.RESERVATION_RELEASE,
    );
    expect(releases).toHaveLength(1);
    expect(releases[0]).toMatchObject({ amountMicroUsd: 167_000n });
    expect(store.ledger.some((row) => row.kind === CreditLedgerKind.CONSUMPTION)).toBe(false);
    expect(store.wallet.grantMicroUsd).toBe(BALANCE);
    expect(store.wallet.reservedMicroUsd).toBe(0n);
  });

  it('still settles a Gemini image on its tokens (no per-unit rate)', async () => {
    findRate.mockResolvedValue(GEMINI_IMAGE_RATE);
    const outcome = await manager.reserve(
      imageReserve({ provider: 'GEMINI', model: 'gemini-2.5-flash-image' }),
    );
    if (!outcome.metered) {
      throw new Error('expected a metered hold');
    }

    await manager.finalize({
      reservationId: outcome.reservationId,
      promptTokens: 24,
      completionTokens: 1_310,
      cachedPromptTokens: 0,
      reasoningTokens: 0,
      toolCalls: 0,
      searchCalls: 0,
      imageUnits: 1,
    });

    // 24 × $0.30/M → 8 (ceil) + 1,310 × $30/M = 39,300. The image unit adds
    // nothing because Gemini publishes no per-image rate.
    const consumption = store.ledger.find((row) => row.kind === CreditLedgerKind.CONSUMPTION);
    expect(consumption).toMatchObject({ amountMicroUsd: -39_308n });
  });

  it('settles an old-shape finalize (no unit fields) on tokens alone', async () => {
    findRate.mockResolvedValue({ ...GPT_IMAGE_RATE, rates: rates({}) });
    const outcome = await manager.reserve(
      imageReserve({ model: 'gpt-5', surface: PaygSurface.CHAT, promptTokens: 1_000 }),
    );
    if (!outcome.metered) {
      throw new Error('expected a metered hold');
    }

    await manager.finalize({
      reservationId: outcome.reservationId,
      promptTokens: 1_000,
      completionTokens: 2_000,
      cachedPromptTokens: 0,
      reasoningTokens: 0,
      toolCalls: 0,
      searchCalls: 0,
    });

    const consumption = store.ledger.find((row) => row.kind === CreditLedgerKind.CONSUMPTION);
    expect(consumption).toMatchObject({ amountMicroUsd: -21_000n });
  });

  it('writes no ledger row at all for a local provider', async () => {
    const outcome = await manager.reserve(imageReserve({ provider: 'OLLAMA' }));

    expect(outcome.metered).toBe(false);
    expect(store.ledger).toHaveLength(0);
    expect(findRate).not.toHaveBeenCalled();
  });

  it('holds and settles transcription seconds and tts characters at their rates', async () => {
    findRate.mockResolvedValue({
      ...GPT_IMAGE_RATE,
      rates: rates({
        model: 'speech-fixture',
        inputPerMillionMicroUsd: 0,
        outputPerMillionMicroUsd: 0,
        audioPerUnitMicroUsd: 100,
        ttsPerCharacterMicroUsd: 15,
      }),
    });
    const outcome = await manager.reserve(
      imageReserve({ imageUnits: 0, audioSeconds: 600, ttsCharacters: 2_000 }),
    );
    if (!outcome.metered) {
      throw new Error('expected a metered hold');
    }
    // 600 s × 100 + 2,000 chars × 15 = 90,000
    expect(outcome.heldMicroUsd).toBe(90_000);

    await manager.finalize({
      reservationId: outcome.reservationId,
      promptTokens: 0,
      completionTokens: 0,
      cachedPromptTokens: 0,
      reasoningTokens: 0,
      toolCalls: 0,
      searchCalls: 0,
      audioSeconds: 300,
      ttsCharacters: 1_000,
    });

    const consumption = store.ledger.find((row) => row.kind === CreditLedgerKind.CONSUMPTION);
    expect(consumption).toMatchObject({ amountMicroUsd: -45_000n });
  });
});
