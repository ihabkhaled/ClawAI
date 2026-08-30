import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PAYG_ENABLED_SETTING_KEY, PAYG_MIN_VIABLE_OUTPUT_TOKENS } from '@claw/shared-constants';
import {
  BillingErrorCode,
  type PaygReservationOutcome,
  type RawTokenBreakdown,
  TokenUsageSource,
  UserRole,
} from '@claw/shared-types';
import {
  calculateCostMicroUsd,
  clampOutputTokensToBalance,
  toRawTokenBreakdown,
} from '@claw/shared-utilities';

import { PaygRejectionException } from '../../../common/errors';
import { RedisService } from '../../../infrastructure/redis/redis.service';
import {
  CreditLedgerKind,
  type UserCreditWallet,
  type WeightedUsageRecord,
} from '../../../generated/prisma';
import { AuthRepository } from '../../auth/repositories/auth.repository';
import { ADJUST_QUOTA_LUA, RESERVE_QUOTA_LUA } from '../../quota/constants/quota-redis.constants';
import { WeightedUsageRepository } from '../../quota/repositories/weighted-usage.repository';
import { type QuotaPeriodKeys } from '../../quota/types/quota.types';
import {
  buildAdjustArgv,
  buildPeriodKeys,
  buildQuotaKeys,
  buildReserveArgv,
  parseReserveOutcome,
} from '../../quota/utilities/quota-reservation.utility';
import { SystemSettingService } from '../../system-settings/services/system-setting.service';
import { ConnectorPolicyClient } from '../clients/connector-policy.client';
import { ModelRateClient } from '../clients/model-rate.client';
import { CreditLedgerRepository } from '../repositories/credit-ledger.repository';
import { CreditEventService } from '../services/credit-event.service';
import { CreditGrantService } from '../services/credit-grant.service';
import { CreditWalletService } from '../services/credit-wallet.service';
import {
  type CreditBucketSplit,
  type CreditFinalizeInput,
  type CreditReserveInput,
  type PaygClassification,
  type PaygRateSnapshot,
} from '../types/credit.types';
import { availableMicroUsd, toSafeBalanceNumber } from '../utilities/credit-bucket.utility';
import {
  buildCreditLimits,
  buildCreditReleaseDeltas,
  buildCreditReservationInput,
  creditHoldKeys,
  parseHoldCounter,
  splitHoldAcrossBuckets,
} from '../utilities/credit-reservation.utility';
import {
  isExemptProvider,
  isMeteredProvider,
  isUsablePaygRate,
} from '../utilities/payg-classification.utility';

/**
 * The chokepoint. Every dollar this platform spends on a metered provider
 * passes through `reserve` first.
 *
 * The ORDER of the checks is the design:
 *   1. kill switch — read ONCE, here, not at eleven call sites
 *   2. provider exemption — local compute costs nothing marginal
 *   3. administrator — bypasses metering entirely
 *   4. connector policy — the admin toggle, at provider grain
 *   5. price — an unpriced metered model is BLOCKED, never free
 *   6. idempotency — a retried request reuses its hold
 *   7. affordability clamp — the answer is shortened to fit the balance
 *   8. atomic Lua — the only place two concurrent requests are ordered
 *   9. durable write — Redis has already moved, so a failure gives it back
 *
 * Steps 1–4 short-circuit before the wallet is read: a local chat must not pay
 * for a Postgres round trip it does not need.
 */
@Injectable()
export class CreditReservationManager {
  private readonly logger = new Logger(CreditReservationManager.name);

  constructor(
    private readonly redis: RedisService,
    private readonly wallets: CreditWalletService,
    private readonly grants: CreditGrantService,
    private readonly rates: ModelRateClient,
    private readonly policy: ConnectorPolicyClient,
    private readonly settings: SystemSettingService,
    private readonly usage: WeightedUsageRepository,
    private readonly users: AuthRepository,
    private readonly events: CreditEventService,
    private readonly ledger: CreditLedgerRepository,
  ) {}

  async reserve(input: CreditReserveInput): Promise<PaygReservationOutcome> {
    this.logger.debug(
      `reserve: user=${input.userId} provider=${input.provider} model=${input.model}`,
    );
    const classification = await this.classify(input.userId, input.provider, input.model);
    if (!classification.isPayg) {
      return { metered: false, reason: classification.reason };
    }
    const existing = await this.usage.findOpenPaygReservation(input.userId, input.requestId);
    if (existing !== null) {
      this.logger.warn(`reserve: reusing hold for repeated request=${input.requestId}`);
      return this.reuseHold(existing, input.requestedMaxOutputTokens);
    }
    return this.takeHold(input, classification.rate);
  }

  /**
   * Reconciles a hold against what the provider actually used.
   *
   * Never throws for an unknown or already-settled reservation. The user has
   * their answer by this point, and turning a bookkeeping miss into a request
   * failure would show an error for a message that succeeded.
   */
  async finalize(input: CreditFinalizeInput): Promise<void> {
    const record = await this.claimRecord(input.reservationId, 'finalize');
    if (record === null) {
      return;
    }
    const breakdown = toRawTokenBreakdown(
      {
        promptTokens: input.promptTokens,
        completionTokens: input.completionTokens,
        totalTokens: input.promptTokens + input.completionTokens,
        cachedPromptTokens: input.cachedPromptTokens,
        reasoningTokens: input.reasoningTokens,
        estimated: false,
        // Settlement prices what the provider actually reported, so the counts
        // are measured rather than inferred from text.
        source: TokenUsageSource.NATIVE,
      },
      { toolCalls: input.toolCalls, searchCalls: input.searchCalls },
    );
    const actualMicroUsd = await this.priceUsage(record, breakdown);
    const moved = await this.usage.markFinalized({
      reservationId: input.reservationId,
      rawInputTokens: breakdown.inputTokens,
      rawCachedTokens: breakdown.cachedInputTokens,
      rawReasoningTokens: breakdown.reasoningTokens,
      rawOutputTokens: breakdown.outputTokens,
      toolCallCount: breakdown.toolCalls,
      actualWeightedTokens: toSafeBalanceNumber(actualMicroUsd),
      actualCostMicroUsd: actualMicroUsd,
    });
    if (moved === 0) {
      this.logger.warn(`finalize: reservation ${input.reservationId} was already settled`);
      return;
    }
    await this.settle(record, actualMicroUsd);
  }

  /**
   * What the request actually cost, in integer micro-USD.
   *
   * The rate is normally still in the cache from the reserve a few seconds ago.
   * When it is NOT — a price lookup that fails between reserve and finalize —
   * the full hold is charged rather than nothing. The hold is the worst case
   * the user was already told about and can never exceed it, whereas charging
   * zero would make every pricing outage a window of free frontier inference.
   */
  private async priceUsage(
    record: WeightedUsageRecord,
    breakdown: RawTokenBreakdown,
  ): Promise<bigint> {
    const rate = await this.rates.findRate(record.provider, record.model);
    if (rate === null || !isUsablePaygRate(rate)) {
      this.logger.error(
        `priceUsage: no price for ${record.provider}/${record.model} at finalize — charging the hold`,
      );
      return record.creditGrantMicroUsd + record.creditPurchasedMicroUsd;
    }
    return BigInt(calculateCostMicroUsd(breakdown, rate.rates));
  }

  /**
   * Gives an unspent hold back.
   *
   * Idempotent BY THE DATABASE: the state transition is a conditional
   * `updateMany` and the money only moves when it reports one row. A double
   * release is a no-op, not a double refund — the difference between a retry
   * and free money.
   */
  async release(reservationId: string, reason: string): Promise<void> {
    const record = await this.claimRecord(reservationId, 'release');
    if (record === null) {
      return;
    }
    const moved = await this.usage.markReleased(reservationId);
    if (moved === 0) {
      this.logger.warn(`release: reservation ${reservationId} was already settled`);
      return;
    }
    const wallet = await this.wallets.ensure(record.userId);
    await this.wallets.applyRelease({
      userId: record.userId,
      walletId: wallet.id,
      reservationId,
      held: CreditReservationManager.heldSplit(record),
      kind: CreditLedgerKind.RESERVATION_RELEASE,
      reason,
    });
    await this.releaseCounters(record);
  }

  // ── classification ────────────────────────────────────────────────────────

  private async classify(
    userId: string,
    provider: string,
    model: string,
  ): Promise<PaygClassification> {
    if (!(await this.settings.isEnabled(PAYG_ENABLED_SETTING_KEY, false))) {
      return { isPayg: false, reason: 'METERING_DISABLED' };
    }
    if (isExemptProvider(provider)) {
      return { isPayg: false, reason: 'NOT_PAYG' };
    }
    const user = await this.users.findUserById(userId);
    if (user !== null && user.role === UserRole.ADMIN) {
      return { isPayg: false, reason: 'ADMIN_BYPASS' };
    }
    const policy = await this.policy.getPolicy();
    if (!isMeteredProvider(provider, policy, ConnectorPolicyClient.defaultForProvider(provider))) {
      return { isPayg: false, reason: 'NOT_PAYG' };
    }
    return { isPayg: true, rate: await this.requireRate(provider, model) };
  }

  /**
   * Resolves a usable price or refuses.
   *
   * The two failures are deliberately different codes. "We could not reach the
   * price registry" is OUR outage and must not be dressed up as the user's
   * empty wallet, or we sell a top-up that was never needed.
   */
  private async requireRate(provider: string, model: string): Promise<PaygRateSnapshot> {
    const rate = await this.rates.findRate(provider, model);
    if (rate === null) {
      this.logger.error(`requireRate: no price available for ${provider}/${model}`);
      throw new PaygRejectionException(BillingErrorCode.PAYG_PRICING_UNAVAILABLE, 0, null);
    }
    if (!isUsablePaygRate(rate)) {
      this.logger.error(`requireRate: ${provider}/${model} is unpriced or a local-compute answer`);
      throw new PaygRejectionException(BillingErrorCode.PAYG_MODEL_UNPRICED, 0, null);
    }
    return rate;
  }

  // ── holding ───────────────────────────────────────────────────────────────

  private async takeHold(
    input: CreditReserveInput,
    rate: PaygRateSnapshot,
  ): Promise<PaygReservationOutcome> {
    // Brings the period grant up to date FIRST. A user whose month rolled over
    // a minute ago must not be told they are out of credit because a background
    // job has not run yet.
    const balances = await this.grants.ensureCurrentPeriod(input.userId);
    const available = toSafeBalanceNumber(balances.availableMicroUsd);
    const clamp = clampOutputTokensToBalance({
      rates: rate.rates,
      balanceMicroUsd: available,
      promptTokens: input.promptTokens,
      cachedPromptTokens: input.cachedPromptTokens,
      requestedMaxOutputTokens: input.requestedMaxOutputTokens,
      minViableOutputTokens: PAYG_MIN_VIABLE_OUTPUT_TOKENS,
    });
    if (clamp.status === 'PROMPT_UNAFFORDABLE') {
      // An empty wallet is EXHAUSTED, not "too expensive". Both refuse, but
      // they tell the user to do different things: "shorten the conversation"
      // is advice that cannot work at a balance of zero, and it is the case a
      // free-tier user hits on their very first paid message. Only report
      // TOO_EXPENSIVE when there is real credit that this particular prompt
      // outgrew.
      throw new PaygRejectionException(
        available > 0
          ? BillingErrorCode.PAYG_PROMPT_TOO_EXPENSIVE
          : BillingErrorCode.PAYG_CREDIT_EXHAUSTED,
        available,
        clamp.promptCostMicroUsd,
      );
    }
    if (clamp.status === 'OUTPUT_UNAFFORDABLE') {
      throw new PaygRejectionException(BillingErrorCode.PAYG_CREDIT_EXHAUSTED, available, null);
    }
    return this.commitHold(input, balances.wallet, BigInt(clamp.worstCaseCostMicroUsd), clamp);
  }

  private async commitHold(
    input: CreditReserveInput,
    wallet: UserCreditWallet,
    holdMicroUsd: bigint,
    ceiling: { maxOutputTokens: number; clamped: boolean },
  ): Promise<PaygReservationOutcome> {
    const now = new Date();
    const periods = buildPeriodKeys(now);
    const keys = buildQuotaKeys(input.userId, periods);
    const split = splitHoldAcrossBuckets(holdMicroUsd, wallet, await this.readOutstanding(keys));
    const reservationId = randomUUID();

    const raw = await this.redis
      .getClient()
      .eval(
        RESERVE_QUOTA_LUA,
        keys.length,
        ...keys,
        ...buildReserveArgv(
          buildCreditLimits(wallet),
          buildCreditReservationInput(input, split),
          now,
        ),
      );
    const outcome = parseReserveOutcome(raw);
    if (!outcome?.ok) {
      this.logger.warn(
        `commitHold: refused user=${input.userId} window=${outcome === null ? 'PARSE_FAILURE' : outcome.window}`,
      );
      throw new PaygRejectionException(
        BillingErrorCode.PAYG_CREDIT_EXHAUSTED,
        toSafeBalanceNumber(
          availableMicroUsd(
            wallet.grantMicroUsd,
            wallet.purchasedMicroUsd,
            wallet.reservedMicroUsd,
          ),
        ),
        toSafeBalanceNumber(holdMicroUsd),
      );
    }
    await this.persistHold(input, wallet, reservationId, split, periods, keys);
    return CreditReservationManager.grantedOutcome(
      reservationId,
      wallet,
      holdMicroUsd,
      split,
      ceiling,
    );
  }

  /**
   * The durable half. Redis has ALREADY moved by this point, so any failure
   * here has to give the counters back — otherwise a database blip would shrink
   * the user's balance until the sweeper noticed.
   */
  private async persistHold(
    input: CreditReserveInput,
    wallet: UserCreditWallet,
    reservationId: string,
    split: CreditBucketSplit,
    periods: QuotaPeriodKeys,
    keys: string[],
  ): Promise<void> {
    try {
      await this.usage.createReservation({
        reservationId,
        input: buildCreditReservationInput(input, split),
        ...periods,
      });
      await this.wallets.applyHold({
        userId: input.userId,
        walletId: wallet.id,
        reservationId,
        requestId: input.requestId,
        provider: input.provider,
        model: input.model,
        surface: input.surface,
        workflow: input.workflow,
        split,
      });
    } catch (error) {
      this.logger.error(`persistHold: failed — ${(error as Error).message}`);
      await this.adjustCounters(keys, split);
      await this.usage.deleteByReservationId(reservationId);
      throw error;
    }
  }

  // ── settlement ────────────────────────────────────────────────────────────

  private async settle(record: WeightedUsageRecord, actualMicroUsd: bigint): Promise<void> {
    const wallet = await this.wallets.ensure(record.userId);
    // Carried forward from the RESERVATION row: the durable reservation record
    // has no surface column, and a CONSUMPTION line that cannot say where the
    // money went is the line a customer disputes.
    const attribution = await this.ledger.findReservationAttribution(record.reservationId);
    const settlement = await this.wallets.applySettlement({
      userId: record.userId,
      walletId: wallet.id,
      reservationId: record.reservationId,
      held: CreditReservationManager.heldSplit(record),
      actualMicroUsd,
      provider: record.provider,
      model: record.model,
      surface: attribution?.surface ?? null,
      workflow: attribution?.workflow ?? record.workflow,
    });
    this.logger.log(
      `settle: reservation=${record.reservationId} charged=${settlement.chargedMicroUsd.toString()}`,
    );
    await this.releaseCounters(record);
    // Fire-and-forget: the money has already moved and the user already has
    // their answer. A broker hiccup must not turn a successful settlement into
    // a failed request. `publishBalanceState` swallows its own errors.
    void this.events.publishBalanceState(record.userId, settlement);
  }

  private async claimRecord(
    reservationId: string,
    operation: string,
  ): Promise<WeightedUsageRecord | null> {
    const record = await this.usage.findByReservationId(reservationId);
    if (!record?.isPayg) {
      this.logger.warn(`${operation}: unknown or non-PAYG reservation ${reservationId}`);
      return null;
    }
    return record;
  }

  // ── Redis counters ────────────────────────────────────────────────────────

  private async readOutstanding(keys: string[]): Promise<CreditBucketSplit> {
    const holdKeys = creditHoldKeys(keys);
    try {
      const [grant, purchased] = await this.redis
        .getClient()
        .mget(holdKeys.grant, holdKeys.purchased);
      return {
        // ioredis types an MGET slot as possibly `undefined`; a missing counter
        // and an absent key mean the same thing here — nothing is held.
        grantMicroUsd: parseHoldCounter(grant ?? null),
        purchasedMicroUsd: parseHoldCounter(purchased ?? null),
      };
    } catch (error) {
      // Best effort. A failed read only makes the split more grant-heavy; the
      // Lua check still refuses an over-draw, so this cannot hand out money.
      this.logger.warn(
        `readOutstanding: could not read hold counters — ${(error as Error).message}`,
      );
      return { grantMicroUsd: 0n, purchasedMicroUsd: 0n };
    }
  }

  /**
   * Clears the Redis hold counters for a settled or released reservation.
   *
   * Always the FULL held amount, never the actual spend: the counters track
   * outstanding holds, and settled spend has already been subtracted from the
   * wallet in Postgres. Reconciling both would charge the same dollars twice.
   */
  private async releaseCounters(record: WeightedUsageRecord): Promise<void> {
    const keys = buildQuotaKeys(record.userId, {
      dayKey: record.dayKey,
      weekKey: record.weekKey,
      monthKey: record.monthKey,
    });
    await this.adjustCounters(keys, CreditReservationManager.heldSplit(record));
  }

  private async adjustCounters(keys: string[], split: CreditBucketSplit): Promise<void> {
    await this.redis
      .getClient()
      .eval(
        ADJUST_QUOTA_LUA,
        keys.length,
        ...keys,
        ...buildAdjustArgv(buildCreditReleaseDeltas(split)),
      );
  }

  // ── outcome shaping ───────────────────────────────────────────────────────

  private static heldSplit(record: WeightedUsageRecord): CreditBucketSplit {
    return {
      grantMicroUsd: record.creditGrantMicroUsd,
      purchasedMicroUsd: record.creditPurchasedMicroUsd,
    };
  }

  private static grantedOutcome(
    reservationId: string,
    wallet: UserCreditWallet,
    holdMicroUsd: bigint,
    split: CreditBucketSplit,
    ceiling: { maxOutputTokens: number; clamped: boolean },
  ): PaygReservationOutcome {
    return {
      metered: true,
      reservationId,
      maxOutputTokens: ceiling.maxOutputTokens,
      clamped: ceiling.clamped,
      heldMicroUsd: toSafeBalanceNumber(split.grantMicroUsd + split.purchasedMicroUsd),
      availableAfterMicroUsd: toSafeBalanceNumber(
        availableMicroUsd(
          wallet.grantMicroUsd,
          wallet.purchasedMicroUsd,
          wallet.reservedMicroUsd + holdMicroUsd,
        ),
      ),
    };
  }

  /**
   * The answer a retried request gets.
   *
   * Reuses the SAME hold instead of taking a second one — that is what makes
   * `reserve` idempotent on `(userId, requestId)`. The ceiling is capped again
   * at what was asked for, so a retry can never widen the original budget.
   */
  private async reuseHold(
    record: WeightedUsageRecord,
    requestedMaxOutputTokens: number,
  ): Promise<PaygReservationOutcome> {
    const balances = await this.wallets.getBalances(record.userId);
    return {
      metered: true,
      reservationId: record.reservationId,
      maxOutputTokens: requestedMaxOutputTokens,
      clamped: false,
      heldMicroUsd: toSafeBalanceNumber(
        record.creditGrantMicroUsd + record.creditPurchasedMicroUsd,
      ),
      availableAfterMicroUsd: toSafeBalanceNumber(balances.availableMicroUsd),
    };
  }
}
