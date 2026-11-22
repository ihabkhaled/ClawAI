import { HttpStatus } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { type Mock, vi } from 'vitest';
import { BillingErrorCode, PaygBillingMode, PaygSurface, UserRole } from '@claw/shared-types';

import { BusinessException, PaygRejectionException } from '../../../../common/errors';
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
import {
  CREDIT_FIXED_COST_MICRO_USD_MAX,
  CREDIT_FIXED_PRICE_MIXED,
  CREDIT_FIXED_PRICE_NOT_ALLOWED,
  CREDIT_FIXED_PRICE_REQUIRED,
} from '../../constants/credit.constants';
import { finalizeCreditSchema, reserveCreditSchema } from '../../dto/credit-internal.dto';
import { CreditLedgerRepository } from '../../repositories/credit-ledger.repository';
import { CreditWalletRepository } from '../../repositories/credit-wallet.repository';
import { CreditBillingModeService } from '../../services/credit-billing-mode.service';
import { CreditEventService } from '../../services/credit-event.service';
import { CreditFreeAllowanceService } from '../../services/credit-free-allowance.service';
import { CreditGrantService } from '../../services/credit-grant.service';
import { CreditWalletService } from '../../services/credit-wallet.service';
import { PlanCallLimitService } from '../../services/plan-call-limit.service';
import { ThreadJobBudgetCreditLinkService } from '../../services/thread-job-budget-credit-link.service';
import {
  type CreditFinalizeInput,
  type CreditLedgerDraft,
  type CreditMovementStep,
  type CreditReserveInput,
} from '../../types/credit.types';
import {
  toCreditFinalizeInput,
  toCreditReserveInput,
} from '../../utilities/credit-request.utility';
import { CreditReservationManager } from '../credit-reservation.manager';

// Fixed-price surfaces (ADR-221): Live Intelligence is priced by live-service's
// versioned policy and sent as `fixedCostMicroUsd`. Driven through the REAL
// manager and REAL wallet service over an in-memory wallet + ledger, so the
// money that moves is the money asserted.

const BALANCE = 1_000_000n; // $1.00 of plan grant
const BLOCK_PRICE = 20_000; // one 60-second block at $0.02/min

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

class FakeWalletStore {
  readonly ledger: CreditLedgerDraft[] = [];
  wallet: UserCreditWallet = {
    id: 'wallet-1',
    userId: 'user-1',
    grantMicroUsd: BALANCE,
    purchasedMicroUsd: 0n,
    reservedMicroUsd: 0n,
    periodGrantMicroUsd: BALANCE,
    periodKey: '2026-11',
    grantResetsAt: new Date('2026-12-01T00:00:00.000Z'),
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
    requestId: 'live:sess-1:0',
    provider: 'CLAW_LIVE',
    model: 'live-intelligence',
    workflow: null,
    rawInputTokens: 0,
    rawCachedTokens: 0,
    rawCacheWriteTokens: 0,
    rawReasoningTokens: 0,
    rawOutputTokens: 0,
    toolCallCount: 0,
    isPayg: true,
    creditGrantMicroUsd: 0n,
    creditPurchasedMicroUsd: 0n,
    isFreeAllowance: false,
    weightedTokens: 0,
    estimatedCostMicroUsd: 0n,
    actualCostMicroUsd: null,
    currency: 'USD',
    state: WeightedUsageState.RESERVED,
    dayKey: '2026-11-22',
    weekKey: '2026-W47',
    monthKey: '2026-11',
    billingPeriodKey: null,
    createdAt: new Date(),
    finalizedAt: null,
    ...overrides,
  };
}

function liveReserve(overrides: Partial<CreditReserveInput> = {}): CreditReserveInput {
  return {
    userId: 'user-1',
    requestId: 'live:sess-1:0',
    provider: 'CLAW_LIVE',
    model: 'live-intelligence',
    surface: PaygSurface.LIVE_INTELLIGENCE,
    workflow: null,
    promptTokens: 0,
    cachedPromptTokens: 0,
    requestedMaxOutputTokens: 1,
    fixedCostMicroUsd: BLOCK_PRICE,
    ...overrides,
  };
}

function liveFinalize(
  reservationId: string,
  overrides: Partial<CreditFinalizeInput> = {},
): CreditFinalizeInput {
  return {
    reservationId,
    promptTokens: 0,
    completionTokens: 0,
    cachedPromptTokens: 0,
    reasoningTokens: 0,
    toolCalls: 0,
    searchCalls: 0,
    fixedCostMicroUsd: BLOCK_PRICE,
    ...overrides,
  };
}

async function expectCode(promise: Promise<unknown>, code: string): Promise<void> {
  const error: unknown = await promise.then(
    () => null,
    (caught: unknown) => caught,
  );
  expect(error).toBeInstanceOf(BusinessException);
  expect((error as BusinessException).code).toBe(code);
  expect((error as BusinessException).getStatus()).toBe(HttpStatus.BAD_REQUEST);
}

describe('CreditReservationManager — fixed-price surfaces', () => {
  let store: FakeWalletStore;
  let findRate: Mock;
  let held: WeightedUsageRecord | null;
  let available: bigint;
  let surfaceOnLedger: PaygSurface;
  let usage: Record<string, Mock>;
  let freeAllowance: { tryAdmit: Mock; resolvePolicy: Mock };
  let isEnabled: Mock;
  let findUserById: Mock;
  let manager: CreditReservationManager;

  beforeEach(async () => {
    store = new FakeWalletStore();
    findRate = vi.fn().mockResolvedValue(null);
    held = null;
    available = BALANCE;
    surfaceOnLedger = PaygSurface.LIVE_INTELLIGENCE;
    isEnabled = vi.fn().mockResolvedValue(true);
    findUserById = vi.fn().mockResolvedValue({ id: 'user-1', role: UserRole.USER });
    // A capped free allowance is in force: a fixed-price surface must never touch it.
    freeAllowance = {
      tryAdmit: vi.fn(),
      resolvePolicy: vi.fn().mockResolvedValue({ limit: 5, maxModelOutputMicroUsd: null }),
    };
    usage = {
      findOpenPaygReservation: vi.fn(() => Promise.resolve(held)),
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
              Promise.resolve({ wallet: store.wallet, availableMicroUsd: available }),
            ),
          },
        },
        { provide: ModelRateClient, useValue: { findRate } },
        // CLAW_LIVE is in no connector policy: the fixed path must not consult it.
        { provide: ConnectorPolicyClient, useValue: { getPolicy: vi.fn().mockResolvedValue({}) } },
        { provide: SystemSettingService, useValue: { isEnabled } },
        { provide: WeightedUsageRepository, useValue: usage },
        { provide: AuthRepository, useValue: { findUserById } },
        {
          provide: CreditEventService,
          useValue: { publishBalanceState: vi.fn().mockResolvedValue(undefined) },
        },
        {
          provide: CreditBillingModeService,
          useValue: { resolve: vi.fn().mockResolvedValue(PaygBillingMode.PAYG) },
        },
        { provide: PlanCallLimitService, useValue: { resolve: vi.fn().mockResolvedValue(null) } },
        {
          provide: ThreadJobBudgetCreditLinkService,
          useValue: {
            spendCeilingMicroUsd: vi.fn().mockResolvedValue(undefined),
            settleForReservation: vi.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: CreditLedgerRepository,
          useValue: {
            findReservationAttribution: vi.fn(() =>
              Promise.resolve({ surface: surfaceOnLedger, workflow: null }),
            ),
          },
        },
        { provide: CreditFreeAllowanceService, useValue: freeAllowance },
      ],
    }).compile();

    manager = module.get(CreditReservationManager);
  });

  async function reserveHeld(): Promise<string> {
    const outcome = await manager.reserve(liveReserve());
    if (!outcome.metered) {
      throw new Error('expected a metered hold');
    }
    return outcome.reservationId;
  }

  describe('reserve', () => {
    it('holds exactly fixedCostMicroUsd with no rate lookup and records the provider/model sent', async () => {
      const outcome = await manager.reserve(liveReserve());

      expect(outcome).toMatchObject({
        metered: true,
        heldMicroUsd: BLOCK_PRICE,
        clamped: false,
        maxOutputTokens: 1,
      });
      expect(findRate).not.toHaveBeenCalled();
      expect(store.ledger).toEqual([
        expect.objectContaining({
          kind: CreditLedgerKind.RESERVATION,
          amountMicroUsd: -BigInt(BLOCK_PRICE),
          provider: 'CLAW_LIVE',
          model: 'live-intelligence',
          surface: PaygSurface.LIVE_INTELLIGENCE,
        }),
      ]);
      expect(store.wallet.reservedMicroUsd).toBe(BigInt(BLOCK_PRICE));
    });

    it('rejects fixedCostMicroUsd on a surface that is not fixed-price', async () => {
      await expectCode(
        manager.reserve(
          liveReserve({ surface: PaygSurface.CHAT, provider: 'OPENAI', model: 'gpt-5' }),
        ),
        CREDIT_FIXED_PRICE_NOT_ALLOWED,
      );
      expect(store.ledger).toHaveLength(0);
    });

    it('rejects a fixed-price surface without fixedCostMicroUsd', async () => {
      await expectCode(
        manager.reserve(liveReserve({ fixedCostMicroUsd: undefined, audioSeconds: 60 })),
        CREDIT_FIXED_PRICE_REQUIRED,
      );
      expect(findRate).not.toHaveBeenCalled();
    });

    it.each([
      ['promptTokens', { promptTokens: 10 }],
      ['cachedPromptTokens', { cachedPromptTokens: 1 }],
      ['cacheWritePromptTokens', { cacheWritePromptTokens: 1 }],
      ['audioSeconds', { audioSeconds: 60 }],
      ['imageUnits', { imageUnits: 1 }],
      ['ttsCharacters', { ttsCharacters: 1 }],
      ['videoSeconds', { videoSeconds: 1 }],
      ['threadJobBudgetId', { threadJobBudgetId: 'job-1' }],
    ])('rejects a fixed price mixed with %s', async (_name, overrides) => {
      await expectCode(manager.reserve(liveReserve(overrides)), CREDIT_FIXED_PRICE_MIXED);
      expect(store.ledger).toHaveLength(0);
    });

    it('is idempotent on requestId: a replay reuses the hold and takes no second one', async () => {
      const first = await manager.reserve(liveReserve());
      const second = await manager.reserve(liveReserve());

      expect(second).toMatchObject({ metered: true, heldMicroUsd: BLOCK_PRICE });
      expect(first.metered && second.metered && second.reservationId).toBe(
        first.metered && first.reservationId,
      );
      expect(usage['createReservation']).toHaveBeenCalledTimes(1);
      expect(store.ledger).toHaveLength(1);
      expect(store.wallet.reservedMicroUsd).toBe(BigInt(BLOCK_PRICE));
    });

    it('refuses with PAYG_CREDIT_EXHAUSTED (402) when the balance cannot cover the price', async () => {
      available = 19_999n;
      const error: unknown = await manager
        .reserve(liveReserve())
        .catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(PaygRejectionException);
      expect((error as PaygRejectionException).code).toBe(BillingErrorCode.PAYG_CREDIT_EXHAUSTED);
      expect((error as PaygRejectionException).getStatus()).toBe(HttpStatus.PAYMENT_REQUIRED);
      expect((error as PaygRejectionException).getResponse()).toMatchObject({
        details: { availableMicroUsd: 19_999, requiredMicroUsd: BLOCK_PRICE },
      });
      expect(store.ledger).toHaveLength(0);
    });

    it('is never admitted on the free allowance, even with a capped plan and an empty wallet', async () => {
      available = 0n;
      await expect(manager.reserve(liveReserve())).rejects.toBeInstanceOf(PaygRejectionException);
      expect(freeAllowance.tryAdmit).not.toHaveBeenCalled();
      expect(freeAllowance.resolvePolicy).not.toHaveBeenCalled();
    });

    it('stays unmetered with the kill switch off, and for an administrator, like every surface', async () => {
      isEnabled.mockResolvedValue(false);
      await expect(manager.reserve(liveReserve())).resolves.toMatchObject({
        metered: false,
        reason: 'METERING_DISABLED',
      });
      isEnabled.mockResolvedValue(true);
      findUserById.mockResolvedValue({ id: 'user-1', role: UserRole.ADMIN });
      await expect(manager.reserve(liveReserve())).resolves.toMatchObject({
        metered: false,
        reason: 'ADMIN_BYPASS',
      });
      expect(store.ledger).toHaveLength(0);
      expect(freeAllowance.tryAdmit).not.toHaveBeenCalled();
    });

    it('holds zero for a zero price instead of refusing', async () => {
      await expect(manager.reserve(liveReserve({ fixedCostMicroUsd: 0 }))).resolves.toMatchObject({
        metered: true,
        heldMicroUsd: 0,
      });
    });
  });

  describe('finalize', () => {
    it('settles the fixed price exactly, with no rate lookup, and stores it on the usage record', async () => {
      const reservationId = await reserveHeld();

      const outcome = await manager.finalize(liveFinalize(reservationId));

      expect(outcome).toEqual({
        settled: true,
        billingMode: PaygBillingMode.PAYG,
        settledCostMicroUsd: BLOCK_PRICE,
      });
      expect(findRate).not.toHaveBeenCalled();
      expect(usage['markFinalized']).toHaveBeenCalledWith(
        expect.objectContaining({
          reservationId,
          actualCostMicroUsd: BigInt(BLOCK_PRICE),
          actualWeightedTokens: BLOCK_PRICE,
          rawInputTokens: 0,
          rawOutputTokens: 0,
        }),
      );
      expect(store.ledger.find((row) => row.kind === CreditLedgerKind.CONSUMPTION)).toMatchObject({
        amountMicroUsd: -BigInt(BLOCK_PRICE),
        surface: PaygSurface.LIVE_INTELLIGENCE,
        provider: 'CLAW_LIVE',
      });
      expect(store.wallet.grantMicroUsd).toBe(BALANCE - BigInt(BLOCK_PRICE));
      expect(store.wallet.reservedMicroUsd).toBe(0n);
    });

    it('caps settlement at the hold when the finalize states more', async () => {
      const reservationId = await reserveHeld();

      const outcome = await manager.finalize(
        liveFinalize(reservationId, { fixedCostMicroUsd: BLOCK_PRICE * 5 }),
      );

      expect(outcome).toMatchObject({ settledCostMicroUsd: BLOCK_PRICE });
      expect(usage['markFinalized']).toHaveBeenCalledWith(
        expect.objectContaining({ actualCostMicroUsd: BigInt(BLOCK_PRICE) }),
      );
      expect(store.wallet.grantMicroUsd).toBe(BALANCE - BigInt(BLOCK_PRICE));
    });

    it('settles a shorter final block below the hold and returns the rest', async () => {
      const reservationId = await reserveHeld();

      await manager.finalize(liveFinalize(reservationId, { fixedCostMicroUsd: 5_000 }));

      expect(store.wallet.grantMicroUsd).toBe(BALANCE - 5_000n);
      expect(store.wallet.reservedMicroUsd).toBe(0n);
    });

    it('rejects a finalize without fixedCostMicroUsd on a fixed-price reservation, moving nothing', async () => {
      const reservationId = await reserveHeld();

      await expectCode(
        manager.finalize(liveFinalize(reservationId, { fixedCostMicroUsd: undefined })),
        CREDIT_FIXED_PRICE_REQUIRED,
      );
      expect(usage['markFinalized']).not.toHaveBeenCalled();
      expect(store.wallet.reservedMicroUsd).toBe(BigInt(BLOCK_PRICE));
    });

    it('rejects fixedCostMicroUsd on a reservation taken under a rate-priced surface', async () => {
      const reservationId = await reserveHeld();
      surfaceOnLedger = PaygSurface.CHAT;

      await expectCode(
        manager.finalize(liveFinalize(reservationId)),
        CREDIT_FIXED_PRICE_NOT_ALLOWED,
      );
      expect(usage['markFinalized']).not.toHaveBeenCalled();
    });

    it('rejects a fixed-price finalize that also reports counts', async () => {
      const reservationId = await reserveHeld();

      await expectCode(
        manager.finalize(liveFinalize(reservationId, { audioSeconds: 60 })),
        CREDIT_FIXED_PRICE_MIXED,
      );
      await expectCode(
        manager.finalize(liveFinalize(reservationId, { completionTokens: 1 })),
        CREDIT_FIXED_PRICE_MIXED,
      );
    });

    it('a replayed finalize is not settled twice', async () => {
      const reservationId = await reserveHeld();
      await manager.finalize(liveFinalize(reservationId));
      usage['markFinalized']?.mockResolvedValue(0);

      await expect(manager.finalize(liveFinalize(reservationId))).resolves.toEqual({
        settled: false,
        billingMode: PaygBillingMode.UNKNOWN,
      });
      expect(store.wallet.grantMicroUsd).toBe(BALANCE - BigInt(BLOCK_PRICE));
    });
  });

  describe('wire DTOs', () => {
    const reserveBody = {
      userId: 'user-1',
      requestId: 'live:sess-1:0',
      provider: 'CLAW_LIVE',
      model: 'live-intelligence',
      surface: PaygSurface.LIVE_INTELLIGENCE,
      promptTokens: 0,
      cachedPromptTokens: 0,
      requestedMaxOutputTokens: 1,
    };
    const finalizeBody = {
      reservationId: '6f1c1f2e-5d8a-4c1b-9a8e-0b6f1d2c3a4b',
      usage: {
        promptTokens: 0,
        completionTokens: 0,
        cachedPromptTokens: 0,
        reasoningTokens: 0,
      },
    };

    it('accepts and forwards an integer fixedCostMicroUsd up to the cap', () => {
      const reserve = reserveCreditSchema.parse({
        ...reserveBody,
        fixedCostMicroUsd: CREDIT_FIXED_COST_MICRO_USD_MAX,
      });
      expect(toCreditReserveInput(reserve).fixedCostMicroUsd).toBe(CREDIT_FIXED_COST_MICRO_USD_MAX);
      const finalize = finalizeCreditSchema.parse({ ...finalizeBody, fixedCostMicroUsd: 20_000 });
      expect(toCreditFinalizeInput(finalize).fixedCostMicroUsd).toBe(20_000);
    });

    it('omits fixedCostMicroUsd from the manager input when the body does not carry it', () => {
      expect(
        'fixedCostMicroUsd' in toCreditReserveInput(reserveCreditSchema.parse(reserveBody)),
      ).toBe(false);
      expect(
        'fixedCostMicroUsd' in toCreditFinalizeInput(finalizeCreditSchema.parse(finalizeBody)),
      ).toBe(false);
    });

    it.each([-1, 1.5, CREDIT_FIXED_COST_MICRO_USD_MAX + 1])(
      'rejects fixedCostMicroUsd = %s',
      (value) => {
        expect(
          reserveCreditSchema.safeParse({ ...reserveBody, fixedCostMicroUsd: value }).success,
        ).toBe(false);
        expect(
          finalizeCreditSchema.safeParse({ ...finalizeBody, fixedCostMicroUsd: value }).success,
        ).toBe(false);
      },
    );
  });
});
