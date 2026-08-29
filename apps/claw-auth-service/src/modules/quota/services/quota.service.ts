import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { QuotaRejectionWindow } from '../../../common/enums/quota-rejection-window.enum';
import { RedisService } from '../../../infrastructure/redis/redis.service';
import { TokenLedgerRepository } from '../repositories/token-ledger.repository';
import { WeightedUsageRepository } from '../repositories/weighted-usage.repository';
import { quotaKey, secondsUntilEndOfUtcDay, utcDateString } from '../constants/quota.constants';
import { ADJUST_QUOTA_LUA, RESERVE_QUOTA_LUA } from '../constants/quota-redis.constants';
import {
  buildAdjustArgv,
  buildPeriodKeys,
  buildQuotaKeys,
  buildReserveArgv,
  parseReserveOutcome,
} from '../utilities/quota-reservation.utility';
import {
  type FinalizeInput,
  type QuotaAdjustmentDeltas,
  type QuotaLimits,
  type QuotaSnapshot,
  type ReserveResult,
  type WeightedFinalizeInput,
  type WeightedReservationInput,
  type WeightedReserveResult,
} from '../types/quota.types';

@Injectable()
export class QuotaService {
  private readonly logger = new Logger(QuotaService.name);

  constructor(
    private readonly redis: RedisService,
    private readonly ledger: TokenLedgerRepository,
    private readonly weightedUsage: WeightedUsageRepository,
  ) {}

  async getSnapshot(userId: string, dailyLimit: number): Promise<QuotaSnapshot> {
    const date = utcDateString(new Date());
    const raw = await this.redis.get(quotaKey(userId, date));
    const used = raw ? Number.parseInt(raw, 10) : 0;
    return { dailyLimit, used, remaining: Math.max(0, dailyLimit - used) };
  }

  // Atomically reserve `estimate` tokens. INCRBY is atomic, so concurrent
  // requests can't both slip past the last slot — if the post-increment total
  // exceeds the limit we DECRBY (release) and reject.
  async reserve(userId: string, dailyLimit: number, estimate: number): Promise<ReserveResult> {
    const now = new Date();
    const date = utcDateString(now);
    const key = quotaKey(userId, date);
    const client = this.redis.getClient();
    const total = await client.incrby(key, estimate);
    // First write of the day → set TTL so the counter resets at UTC midnight.
    if (total === estimate) {
      await client.expire(key, secondsUntilEndOfUtcDay(now));
    }
    if (total > dailyLimit) {
      await client.decrby(key, estimate);
      const used = Math.max(0, total - estimate);
      this.logger.warn(`reserve: quota exceeded user=${userId} used=${used} limit=${dailyLimit}`);
      return {
        ok: false,
        reason: 'QUOTA_EXCEEDED',
        snapshot: { dailyLimit, used, remaining: Math.max(0, dailyLimit - used) },
      };
    }
    return { ok: true, reservationId: randomUUID(), estimate };
  }

  // Reconcile the reservation with actual usage: adjust the Redis counter by
  // (actual - estimate) and persist to the durable ledger.
  async finalize(input: FinalizeInput): Promise<void> {
    const date = utcDateString(new Date());
    const delta = input.actualTotalTokens - input.estimate;
    if (delta !== 0) {
      const client = this.redis.getClient();
      await (delta > 0
        ? client.incrby(quotaKey(input.userId, date), delta)
        : client.decrby(quotaKey(input.userId, date), -delta));
    }
    await this.ledger.addUsage({
      userId: input.userId,
      planId: input.planId,
      date,
      inputTokens: input.inputTokens,
      outputTokens: input.outputTokens,
      totalTokens: input.actualTotalTokens,
    });
    this.logger.debug(
      `finalize: user=${input.userId} actual=${input.actualTotalTokens} estimate=${input.estimate}`,
    );
  }

  // Release a reservation when the request failed before consuming tokens.
  async release(userId: string, estimate: number): Promise<void> {
    const date = utcDateString(new Date());
    await this.redis.getClient().decrby(quotaKey(userId, date), estimate);
    this.logger.debug(`release: user=${userId} estimate=${estimate}`);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Weighted, multi-window reservation
  //
  // Day, week, month, provider-cost ceiling, concurrency, chats and messages are
  // all checked in a SINGLE Lua script. Checking them with separate commands
  // would let two concurrent requests both observe the last free slot.
  // ───────────────────────────────────────────────────────────────────────────

  async reserveWeighted(
    input: WeightedReservationInput,
    limits: QuotaLimits,
  ): Promise<WeightedReserveResult> {
    this.logger.debug(
      `reserveWeighted: user=${input.userId} model=${input.model} weighted=${input.estimatedWeightedTokens}`,
    );
    const now = new Date();
    const periods = buildPeriodKeys(now);
    const keys = buildQuotaKeys(input.userId, periods);
    const outcome = await this.evaluateReservation(keys, buildReserveArgv(limits, input, now));
    if (!outcome.ok) {
      this.logger.warn(
        `reserveWeighted: rejected user=${input.userId} window=${outcome.window} limit=${outcome.limit}`,
      );
      return outcome;
    }
    return this.persistReservation(input, periods, keys);
  }

  // Fails CLOSED: an unparseable Lua reply rejects the request rather than
  // waving it through on a Redis fault.
  private async evaluateReservation(
    keys: string[],
    argv: string[],
  ): Promise<WeightedReserveResult> {
    const raw = await this.redis.getClient().eval(RESERVE_QUOTA_LUA, keys.length, ...keys, ...argv);
    const parsed = parseReserveOutcome(raw);
    if (parsed === null) {
      this.logger.error('evaluateReservation: unrecognised Lua reply — failing closed');
      return { ok: false, window: QuotaRejectionWindow.DAY, current: 0, limit: 0 };
    }
    return parsed;
  }

  // The Redis counters have already moved at this point, so a failed ledger
  // write must give the quota back rather than silently charge the user.
  private async persistReservation(
    input: WeightedReservationInput,
    periods: { dayKey: string; weekKey: string; monthKey: string },
    keys: string[],
  ): Promise<WeightedReserveResult> {
    const reservationId = randomUUID();
    try {
      await this.weightedUsage.createReservation({ reservationId, input, ...periods });
    } catch (error) {
      await this.adjust(keys, {
        weightedTokenDelta: -input.estimatedWeightedTokens,
        costMicroUsdDelta: -input.estimatedCostMicroUsd,
        concurrencyDelta: -input.concurrencyDelta,
        chatsDelta: -input.chatsDelta,
        messagesDelta: -input.messagesDelta,
        creditGrantDelta: -input.creditGrantMicroUsd,
        creditPurchasedDelta: -input.creditPurchasedMicroUsd,
      });
      this.logger.error(`persistReservation: failed — ${(error as Error).message}`);
      throw error;
    }
    return { ok: true, reservationId, estimatedWeightedTokens: input.estimatedWeightedTokens };
  }

  private async adjust(keys: string[], deltas: QuotaAdjustmentDeltas): Promise<void> {
    await this.redis
      .getClient()
      .eval(ADJUST_QUOTA_LUA, keys.length, ...keys, ...buildAdjustArgv(deltas));
  }

  private static keysForRecord(record: {
    userId: string;
    dayKey: string;
    weekKey: string;
    monthKey: string;
  }): string[] {
    return buildQuotaKeys(record.userId, {
      dayKey: record.dayKey,
      weekKey: record.weekKey,
      monthKey: record.monthKey,
    });
  }

  // Reconciles estimate against actual, in whichever direction the difference
  // falls, and frees the concurrency slot. Chats and messages were genuinely
  // consumed, so they stay charged.
  async finalizeWeighted(input: WeightedFinalizeInput): Promise<void> {
    const record = await this.weightedUsage.findByReservationId(input.reservationId);
    if (!record) {
      this.logger.warn(`finalizeWeighted: unknown reservation ${input.reservationId}`);
      return;
    }
    // The credit deltas give the HOLD back rather than reconciling it. Settled
    // PAYG spend is subtracted from the wallet in Postgres, so reconciling the
    // Redis hold counter too would charge the same dollars twice.
    await this.adjust(QuotaService.keysForRecord(record), {
      weightedTokenDelta: input.actualWeightedTokens - record.weightedTokens,
      costMicroUsdDelta: input.actualCostMicroUsd - record.estimatedCostMicroUsd,
      concurrencyDelta: -1,
      chatsDelta: 0,
      messagesDelta: 0,
      creditGrantDelta: -record.creditGrantMicroUsd,
      creditPurchasedDelta: -record.creditPurchasedMicroUsd,
    });
    await this.weightedUsage.finalize(input);
    this.logger.log(
      `finalizeWeighted: reservation=${input.reservationId} weighted=${input.actualWeightedTokens}`,
    );
  }

  // Give everything back when the request failed before the user got a result.
  async releaseWeighted(reservationId: string): Promise<void> {
    const record = await this.weightedUsage.findByReservationId(reservationId);
    if (!record) {
      this.logger.warn(`releaseWeighted: unknown reservation ${reservationId}`);
      return;
    }
    await this.adjust(QuotaService.keysForRecord(record), {
      weightedTokenDelta: -record.weightedTokens,
      costMicroUsdDelta: -record.estimatedCostMicroUsd,
      concurrencyDelta: -1,
      chatsDelta: 0,
      messagesDelta: 0,
      creditGrantDelta: -record.creditGrantMicroUsd,
      creditPurchasedDelta: -record.creditPurchasedMicroUsd,
    });
    await this.weightedUsage.markReleased(reservationId);
    this.logger.debug(`releaseWeighted: reservation=${reservationId}`);
  }
}
