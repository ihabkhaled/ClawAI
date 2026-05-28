import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { RedisService } from '../../../infrastructure/redis/redis.service';
import { TokenLedgerRepository } from '../repositories/token-ledger.repository';
import { quotaKey, secondsUntilEndOfUtcDay, utcDateString } from '../constants/quota.constants';
import { type FinalizeInput, type QuotaSnapshot, type ReserveResult } from '../types/quota.types';

@Injectable()
export class QuotaService {
  private readonly logger = new Logger(QuotaService.name);

  constructor(
    private readonly redis: RedisService,
    private readonly ledger: TokenLedgerRepository,
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
      await (delta > 0 ? client.incrby(quotaKey(input.userId, date), delta) : client.decrby(quotaKey(input.userId, date), -delta));
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
}
