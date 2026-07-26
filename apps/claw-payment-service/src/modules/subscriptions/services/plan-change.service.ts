import { Injectable, Logger } from '@nestjs/common';
import { BillingErrorCode, type BillingInterval, SubscriptionStatus } from '@claw/shared-types';

import { BillingException } from '../../../common/errors';
import { ProrationService } from '../../billing/services/proration.service';
import { CheckoutService } from '../../checkout/services/checkout.service';
import { type CheckoutSessionView } from '../../checkout/types/checkout.types';
import { PlanCatalogClient } from '../../plan-catalog/plan-catalog.client';
import { CHANGEABLE_STATUSES } from '../constants/subscriptions.constants';
import { SubscriptionRepository } from '../repositories/subscription.repository';
import { ScheduledDowngradeService } from './scheduled-downgrade.service';
import { type ConfirmPlanChangeInput } from '../types/plan-change.types';
import { type ProrationQuoteResponse } from '../types/subscription-view.types';
import { toProrationQuoteResponse } from '../utilities/subscription-view.utility';
import { type Subscription } from '../../../generated/prisma';

/**
 * Quote then confirm. The split is the whole point.
 *
 * The user is shown an exact prorated amount and confirms THAT number; confirm
 * references the quote by id and never re-derives the figure. Re-deriving would
 * let the price move between the two calls, and charging a number the customer
 * never saw is indefensible whichever direction it moved.
 */
@Injectable()
export class PlanChangeService {
  private readonly logger = new Logger(PlanChangeService.name);

  constructor(
    private readonly subscriptions: SubscriptionRepository,
    private readonly proration: ProrationService,
    private readonly catalog: PlanCatalogClient,
    private readonly downgrades: ScheduledDowngradeService,
    private readonly checkout: CheckoutService,
  ) {}

  async quote(
    userId: string,
    targetPlanId: string,
    billingInterval: BillingInterval,
  ): Promise<ProrationQuoteResponse> {
    this.logger.debug(`quote: user=${userId} target=${targetPlanId}`);
    const subscription = await this.requireChangeable(userId);

    if (subscription.planId === targetPlanId) {
      this.logger.warn(`quote: user=${userId} is already on plan ${targetPlanId}`);
      throw new BillingException(BillingErrorCode.SUBSCRIPTION_CHANGE_CONFLICT);
    }

    // Both prices come from immutable version rows. The CURRENT one is read by
    // the version the subscriber actually bought, not by today's active price —
    // otherwise a repricing since they subscribed would silently change the
    // credit they are owed for time already paid for.
    const [currentPrice, targetPrice] = await Promise.all([
      this.catalog.requirePriceVersion(subscription.planPriceVersionId),
      this.catalog.requireActivePrice(targetPlanId, billingInterval),
    ]);

    if (currentPrice.currency !== targetPrice.currency) {
      this.logger.error('quote: refusing to prorate across currencies');
      throw new BillingException(BillingErrorCode.CURRENCY_UNSUPPORTED);
    }

    const quote = await this.proration.quote({
      userId,
      subscriptionId: subscription.id,
      currentPlanId: subscription.planId,
      currentPlanSlug: subscription.planSlug,
      currentPriceVersionId: currentPrice.id,
      currentAmountMinor: currentPrice.amountMinor,
      targetPlanId,
      targetPlanSlug: targetPlanId,
      targetPriceVersionId: targetPrice.id,
      targetAmountMinor: targetPrice.amountMinor,
      targetBillingInterval: billingInterval,
      currency: targetPrice.currency,
      periodStartMs: subscription.currentPeriodStart.getTime(),
      periodEndMs: subscription.currentPeriodEnd.getTime(),
    });

    return toProrationQuoteResponse(quote);
  }

  /**
   * Confirms a quote.
   *
   * Returns null when nothing needs paying — a downgrade, or an upgrade whose
   * prorated amount rounds to zero. Those take effect directly; sending a
   * zero-value order to a gateway either fails or produces a meaningless
   * transaction.
   */
  async confirm(input: ConfirmPlanChangeInput): Promise<CheckoutSessionView | null> {
    this.logger.debug(`confirm: user=${input.userId} quote=${input.quoteId}`);
    const subscription = await this.requireChangeable(input.userId);

    // consume() is conditional on the quote still being ACTIVE, so two
    // concurrent confirms race there and exactly one wins.
    const quote = await this.proration.consume(input.quoteId, subscription.id);

    // null means "already done, nothing to pay". Both branches below have
    // applied the change; there is no gateway step to redirect to.
    if (quote.isScheduledForPeriodEnd) {
      await this.downgrades.schedule(subscription, quote);
      this.logger.log(`confirm: scheduled downgrade subscription=${subscription.id}`);
      return null;
    }

    if (!ProrationService.requiresPayment(quote)) {
      await this.downgrades.applyImmediately(subscription, quote);
      this.logger.log(`confirm: zero-amount change applied subscription=${subscription.id}`);
      return null;
    }

    this.logger.log(
      `confirm: upgrade requires payment subscription=${subscription.id} ` +
        `amount=${String(quote.amountDueMinor)} gateway=${input.gateway}`,
    );
    // The amount handed to checkout is the CONSUMED quote's, not the target
    // plan's full price — the customer confirmed the prorated difference.
    return this.checkout.startPlanChange({
      userId: input.userId,
      userEmail: input.userEmail,
      subscriptionId: subscription.id,
      prorationQuoteId: quote.quoteId,
      targetPlanId: quote.targetPlanId,
      targetPlanSlug: quote.targetPlanSlug,
      targetPriceVersionId: quote.targetPriceVersionId,
      // From the QUOTE, not the request: a caller that could name a different
      // interval than the one it was quoted for could pay a monthly price for
      // a yearly plan.
      billingInterval: quote.targetBillingInterval,
      gateway: input.gateway,
      amountDueMinor: quote.amountDueMinor,
      currency: quote.currency,
      idempotencyKey: input.idempotencyKey,
    });
  }

  private async requireChangeable(userId: string): Promise<Subscription> {
    const subscription = await this.subscriptions.findActiveByUserId(userId);
    if (subscription === null) {
      throw new BillingException(BillingErrorCode.SUBSCRIPTION_NOT_FOUND);
    }
    // A PAST_DUE subscriber is excluded on purpose: taking an upgrade payment
    // from someone whose last payment failed stacks a second obligation on an
    // unresolved one.
    if (!CHANGEABLE_STATUSES.includes(subscription.status as SubscriptionStatus)) {
      this.logger.warn(`requireChangeable: status ${subscription.status} cannot change plan`);
      throw new BillingException(BillingErrorCode.SUBSCRIPTION_CHANGE_CONFLICT);
    }
    return subscription;
  }
}
