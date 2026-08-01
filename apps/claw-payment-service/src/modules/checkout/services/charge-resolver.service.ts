import { Injectable, Logger } from '@nestjs/common';
import { BillingErrorCode, type BillingGateway } from '@claw/shared-types';

import { BillingException } from '../../../common/errors';
import { FxService } from '../../fx/services/fx.service';
import { PlanCatalogClient } from '../../plan-catalog/plan-catalog.client';
import { resolveSettlementCurrency } from '../utilities/settlement-currency.utility';
import { type ResolvedCharge } from '../types/checkout.types';

/**
 * Turns "this user wants this plan" into an exact, defensible amount.
 *
 * This is the single place a charge is derived, and it takes nothing from the
 * request body. The base amount comes from the immutable price version; if the
 * gateway settles in another currency, the conversion happens here against a
 * bound FX quote whose id is frozen onto the session so the charge can be
 * re-derived years later.
 */
@Injectable()
export class ChargeResolverService {
  private readonly logger = new Logger(ChargeResolverService.name);

  constructor(
    private readonly catalog: PlanCatalogClient,
    private readonly fx: FxService,
  ) {}

  async resolve(
    planId: string,
    billingInterval: string,
    gateway: BillingGateway,
  ): Promise<ResolvedCharge> {
    this.logger.debug(`resolve: plan=${planId} interval=${billingInterval} gateway=${gateway}`);
    const [price, catalog] = await Promise.all([
      this.catalog.requireActivePrice(planId, billingInterval),
      this.catalog.listCatalog(),
    ]);
    const plan = catalog.find((entry) => entry.id === planId);
    if (plan === undefined) {
      throw new BillingException(BillingErrorCode.PLAN_NOT_PURCHASABLE);
    }

    // A zero-amount plan must not reach a gateway at all — some providers
    // accept it and produce a "paid" order for nothing.
    if (price.amountMinor <= 0) {
      this.logger.error(`resolve: refusing non-positive price plan=${planId}`);
      throw new BillingException(BillingErrorCode.PLAN_NOT_PURCHASABLE);
    }

    const settlementCurrency = resolveSettlementCurrency(gateway);
    if (settlementCurrency === null || settlementCurrency === price.currency) {
      return ChargeResolverService.sameCurrency(price, plan.slug);
    }
    return this.converted(price, settlementCurrency, plan.slug);
  }

  /**
   * Converts an amount that has ALREADY been agreed — a consumed proration
   * quote — into what the gateway will be asked to charge.
   *
   * Distinct from `resolve` because there is no catalog lookup: re-reading the
   * plan's full price here would charge an upgrading customer the whole tier
   * instead of the prorated difference they confirmed.
   */
  async convertQuotedAmount(
    amountDueMinor: number,
    currency: string,
    gateway: BillingGateway,
    planPriceVersionId: string,
    planSlug: string,
  ): Promise<ResolvedCharge> {
    this.logger.debug(
      `convertQuotedAmount: ${String(amountDueMinor)} ${currency} gateway=${gateway}`,
    );
    if (amountDueMinor <= 0) {
      this.logger.error('convertQuotedAmount: refusing a non-positive quoted amount');
      throw new BillingException(BillingErrorCode.PLAN_NOT_PURCHASABLE);
    }
    const price = { id: planPriceVersionId, amountMinor: amountDueMinor, currency };
    const settlementCurrency = resolveSettlementCurrency(gateway);
    if (settlementCurrency === null || settlementCurrency === currency) {
      return ChargeResolverService.sameCurrency(price, planSlug);
    }
    return this.converted(price, settlementCurrency, planSlug);
  }

  private static sameCurrency(
    price: {
      id: string;
      amountMinor: number;
      currency: string;
    },
    planSlug: string,
  ): ResolvedCharge {
    return {
      planSlug,
      planPriceVersionId: price.id,
      baseAmountMinor: price.amountMinor,
      baseCurrency: price.currency,
      chargeAmountMinor: price.amountMinor,
      chargeCurrency: price.currency,
      fxQuoteId: null,
      fxFinalRateScaled: null,
    };
  }

  private async converted(
    price: { id: string; amountMinor: number; currency: string },
    settlementCurrency: string,
    planSlug: string,
  ): Promise<ResolvedCharge> {
    const quote = await this.fx.quote(price.amountMinor, price.currency, settlementCurrency);
    this.logger.log(
      `resolve: converted ${String(price.amountMinor)} ${price.currency} -> ` +
        `${String(quote.convertedAmountMinor)} ${settlementCurrency} quote=${quote.quoteId}`,
    );
    return {
      planSlug,
      planPriceVersionId: price.id,
      baseAmountMinor: price.amountMinor,
      baseCurrency: price.currency,
      chargeAmountMinor: quote.convertedAmountMinor,
      chargeCurrency: quote.quoteCurrency,
      fxQuoteId: quote.quoteId,
      fxFinalRateScaled: quote.finalRateScaled,
    };
  }
}
