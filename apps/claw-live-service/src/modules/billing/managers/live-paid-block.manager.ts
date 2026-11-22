import { Inject, Injectable, Logger } from '@nestjs/common';
import { isPaygCreditExhaustedError, type PaygHold, PaygMeter } from '@claw/shared-entitlements';
import { BillingErrorCode, PaygSurface } from '@claw/shared-types';
import type Redis from 'ioredis';

import { LiveCreditRefusal } from '../../../common/enums/live-credit-refusal.enum';
import { LIVE_REDIS_CLIENT } from '../../../infrastructure/redis/constants/redis.constants';
import {
  LIVE_METER_FAILURE_KEY_PREFIX,
  LIVE_METER_FAILURE_TTL_SECONDS,
  LIVE_PAYG_MODEL,
  LIVE_PAYG_OUTPUT_TOKENS,
  LIVE_PAYG_PROVIDER,
} from '../constants/live-billing.constants';
import type { LiveBlock, LivePaidReserveResult } from '../types/live-billing.types';
import { liveBlockCostMicroUsd } from '../utilities/live-billing.utility';

/**
 * PAYG metering of one Live block at a FIXED price: the policy's per-minute
 * price for the block's seconds, `ceil(paidMicroUsdPerMinute * seconds / 60)`,
 * sent as `fixedCostMicroUsd` on reserve and again on finalize (the seconds
 * were already delivered), with zero tokens and zero units. auth holds exactly
 * that and settles min(price, hold). The requestId is the block key, so a
 * retried settlement reuses its reservation.
 *
 * Never logs a balance (rule 37 item 4).
 */
@Injectable()
export class LivePaidBlockManager {
  private readonly logger = new Logger(LivePaidBlockManager.name);

  constructor(
    private readonly payg: PaygMeter,
    @Inject(LIVE_REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async reserve(block: LiveBlock, pricePerMinuteMicroUsd: number): Promise<LivePaidReserveResult> {
    let hold: PaygHold;
    try {
      hold = await this.payg.reserve({
        userId: block.session.userId,
        requestId: block.key,
        provider: LIVE_PAYG_PROVIDER,
        model: LIVE_PAYG_MODEL,
        surface: PaygSurface.LIVE_INTELLIGENCE,
        promptTokens: 0,
        cachedPromptTokens: 0,
        requestedMaxOutputTokens: LIVE_PAYG_OUTPUT_TOKENS,
        fixedCostMicroUsd: LivePaidBlockManager.fixedCost(pricePerMinuteMicroUsd, block),
      });
    } catch (error: unknown) {
      const refusal = this.classify(error);
      this.logger.warn(`reserve refused requestId=${block.key} outcome=${refusal}`);
      return { held: false, refusal };
    }
    if (hold.clamped) {
      // A clamped hold cannot cover the block: give it back, treat as insufficient credit.
      await this.payg.release(hold, 'CANCELLED');
      this.logger.warn(
        `reserve clamped requestId=${block.key} reservationId=${String(hold.reservationId)}`,
      );
      return { held: false, refusal: LiveCreditRefusal.INSUFFICIENT };
    }
    return { held: true, hold };
  }

  /** Settles the hold at the delivered seconds' price. Never throws (PaygMeter swallows). */
  async finalize(block: LiveBlock, hold: PaygHold, pricePerMinuteMicroUsd: number): Promise<void> {
    await this.payg.finalize(
      hold,
      { promptTokens: 0, completionTokens: 0, cachedPromptTokens: 0, reasoningTokens: 0 },
      { fixedCostMicroUsd: LivePaidBlockManager.fixedCost(pricePerMinuteMicroUsd, block) },
    );
    this.logger.log(
      `finalize requestId=${block.key} reservationId=${String(hold.reservationId)} seconds=${String(block.seconds)}`,
    );
  }

  /** Counts a consecutive meter failure for the session; returns the new count. */
  async recordMeterFailure(sessionId: string): Promise<number> {
    const key = `${LIVE_METER_FAILURE_KEY_PREFIX}${sessionId}`;
    const count = await this.redis.incr(key);
    await this.redis.expire(key, LIVE_METER_FAILURE_TTL_SECONDS);
    return count;
  }

  async clearMeterFailures(sessionId: string): Promise<void> {
    await this.redis.del(`${LIVE_METER_FAILURE_KEY_PREFIX}${sessionId}`);
  }

  /** The block's price as a JS number: bounded by auth's $100 cap, far inside a safe integer. */
  private static fixedCost(pricePerMinuteMicroUsd: number, block: LiveBlock): number {
    return Number(liveBlockCostMicroUsd(pricePerMinuteMicroUsd, block.seconds));
  }

  private classify(error: unknown): LiveCreditRefusal {
    if (!isPaygCreditExhaustedError(error)) return LiveCreditRefusal.METER_UNAVAILABLE;
    return error.errorCode === BillingErrorCode.PAYG_PRICING_UNAVAILABLE ||
      error.errorCode === BillingErrorCode.PAYG_MODEL_UNPRICED
      ? LiveCreditRefusal.METER_UNAVAILABLE
      : LiveCreditRefusal.INSUFFICIENT;
  }
}
