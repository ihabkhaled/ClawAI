import { Injectable, Logger } from '@nestjs/common';
import { BillingErrorCode, ProrationQuoteStatus } from '@claw/shared-types';
import { calculateProration } from '@claw/shared-utilities';

import { AppConfig } from '../../../app/config/app.config';
import { BillingException } from '../../../common/errors';
import { ProrationQuoteRepository } from '../repositories/proration-quote.repository';
import { type ProrationQuoteInput, type ProrationQuoteView } from '../types/proration.types';

// Exact server-side proration for a plan change.
//
// The user is shown a quote and then confirms it. The quote is short-lived and
// single-use: re-deriving the amount at confirm time would let the price move
// between the two steps, and reusing a quote would let a user pay an old, lower
// upgrade price forever.
//
// Downgrades are SCHEDULED for period end rather than refunded, so the user
// keeps the entitlement they already paid for and no cash leaves the business
// without an explicit policy decision.
@Injectable()
export class ProrationService {
  private readonly logger = new Logger(ProrationService.name);

  constructor(private readonly repository: ProrationQuoteRepository) {}

  async quote(input: ProrationQuoteInput, nowMs: number = Date.now()): Promise<ProrationQuoteView> {
    this.logger.debug(
      `quote: subscription=${input.subscriptionId} ${input.currentPlanSlug}->${input.targetPlanSlug}`,
    );
    const isDowngrade = input.targetAmountMinor < input.currentAmountMinor;
    const result = calculateProration({
      currentPeriodPriceMinor: input.currentAmountMinor,
      targetPeriodPriceMinor: input.targetAmountMinor,
      periodStartMs: input.periodStartMs,
      periodEndMs: input.periodEndMs,
      effectiveAtMs: nowMs,
    });

    const expiresAtMs = nowMs + AppConfig.get().FX_QUOTE_TTL_MS;
    const record = await this.repository.create({
      userId: input.userId,
      subscriptionId: input.subscriptionId,
      currentPlanId: input.currentPlanId,
      currentPlanSlug: input.currentPlanSlug,
      currentPlanPriceVersionId: input.currentPriceVersionId,
      currentAmountMinor: input.currentAmountMinor,
      targetPlanId: input.targetPlanId,
      targetPlanSlug: input.targetPlanSlug,
      targetPlanPriceVersionId: input.targetPriceVersionId,
      targetAmountMinor: input.targetAmountMinor,
      targetBillingInterval: input.targetBillingInterval,
      currency: input.currency,
      effectiveAt: new Date(nowMs),
      remainingRatioScaled: result.remainingRatioScaled,
      unusedCurrentCreditMinor: result.unusedCurrentCreditMinor,
      targetRemainingChargeMinor: result.targetRemainingChargeMinor,
      // A downgrade never charges now; it takes effect at period end.
      amountDueMinor: isDowngrade ? 0 : result.amountDueMinor,
      isScheduledForPeriodEnd: isDowngrade,
      scheduledEffectiveAt: isDowngrade ? new Date(input.periodEndMs) : null,
      status: ProrationQuoteStatus.ACTIVE,
      expiresAt: new Date(expiresAtMs),
    });

    return ProrationService.toView(record);
  }

  // Consumes a quote. Expired or already-used quotes are refused rather than
  // silently re-priced: the user confirmed a specific number and that number is
  // what must be charged.
  async consume(
    quoteId: string,
    subscriptionId: string,
    nowMs: number = Date.now(),
  ): Promise<ProrationQuoteView> {
    const quote = await this.repository.findById(quoteId);
    if (!quote || quote.subscriptionId !== subscriptionId) {
      throw new BillingException(BillingErrorCode.PRORATION_QUOTE_EXPIRED);
    }
    if (quote.status !== ProrationQuoteStatus.ACTIVE) {
      this.logger.warn(`consume: quote ${quoteId} already ${quote.status}`);
      throw new BillingException(BillingErrorCode.PRORATION_QUOTE_EXPIRED);
    }
    if (quote.expiresAt.getTime() <= nowMs) {
      await this.repository.markStatus(quoteId, ProrationQuoteStatus.EXPIRED);
      throw new BillingException(BillingErrorCode.PRORATION_QUOTE_EXPIRED);
    }
    // Conditional on the CURRENT status: two concurrent confirms race here and
    // exactly one updates a row. The loser is refused rather than both being
    // allowed to charge.
    const consumed = await this.repository.consumeIfActive(quoteId, ProrationQuoteStatus.ACTIVE);
    if (consumed === 0) {
      throw new BillingException(BillingErrorCode.SUBSCRIPTION_CHANGE_CONFLICT);
    }
    return ProrationService.toView(quote);
  }

  // A zero amount due is activated directly. Creating a zero-value order at the
  // gateway would fail or produce a meaningless transaction; the invoice still
  // records the adjustment so the change is auditable.
  static requiresPayment(quote: ProrationQuoteView): boolean {
    return !quote.isScheduledForPeriodEnd && quote.amountDueMinor > 0;
  }

  private static toView(record: {
    id: string;
    subscriptionId: string;
    targetPlanId: string;
    targetPlanSlug: string;
    targetPlanPriceVersionId: string;
    targetBillingInterval: string;
    currency: string;
    remainingRatioScaled: number;
    unusedCurrentCreditMinor: number;
    targetRemainingChargeMinor: number;
    amountDueMinor: number;
    isScheduledForPeriodEnd: boolean;
    scheduledEffectiveAt: Date | null;
    expiresAt: Date;
  }): ProrationQuoteView {
    return {
      quoteId: record.id,
      subscriptionId: record.subscriptionId,
      targetPlanId: record.targetPlanId,
      targetPlanSlug: record.targetPlanSlug,
      targetPriceVersionId: record.targetPlanPriceVersionId,
      targetBillingInterval: record.targetBillingInterval,
      currency: record.currency,
      remainingRatioScaled: record.remainingRatioScaled,
      unusedCurrentCreditMinor: record.unusedCurrentCreditMinor,
      targetRemainingChargeMinor: record.targetRemainingChargeMinor,
      amountDueMinor: record.amountDueMinor,
      isScheduledForPeriodEnd: record.isScheduledForPeriodEnd,
      scheduledEffectiveAtMs: record.scheduledEffectiveAt?.getTime() ?? null,
      expiresAtMs: record.expiresAt.getTime(),
    };
  }
}
