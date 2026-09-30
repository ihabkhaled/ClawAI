import { HttpStatus, Injectable, Logger } from '@nestjs/common';

import { BusinessException, EntityNotFoundException } from '../../../common/errors';
import { BillingIntervalKind } from '../../../generated/prisma';
import {
  DERIVED_BILLING_INTERVALS,
  PLAN_HAS_NO_MONTHLY_PRICE,
} from '../constants/plan-interval-pricing.constants';
import { type SetPlanIntervalDiscountsDto } from '../dto/plan-interval-discounts.dto';
import { PlanBillingRepository } from '../repositories/plan-billing.repository';
import { PlansRepository } from '../repositories/plans.repository';
import { type PlanPriceVersionView } from '../types/plan-catalog.types';
import {
  type PlanIntervalDiscounts,
  type PlanIntervalPricingView,
  type PriceSetEntry,
} from '../types/plan-interval-pricing.types';
import { toPriceVersionView } from '../utilities/plan-catalog.utility';
import { deriveIntervalPrices } from '../utilities/plan-interval-price.utility';

/**
 * Keeps QUARTERLY, SEMIANNUAL and YEARLY prices equal to what the plan's
 * MONTHLY price and its three discounts say they are.
 *
 * The charged amount is still an immutable PlanPriceVersion row — checkout and
 * invoices never recompute it — but nobody types those three figures any more:
 * an admin sets the monthly price and the discounts, and this service mints the
 * matching versions in the same transaction. That is what stops a yearly price
 * drifting above twelve monthly payments.
 */
@Injectable()
export class PlanIntervalPricingService {
  private readonly logger = new Logger(PlanIntervalPricingService.name);

  constructor(
    private readonly plans: PlansRepository,
    private readonly billing: PlanBillingRepository,
  ) {}

  /** Publishes a MONTHLY price and re-derives every longer term from it. */
  async publishMonthly(input: {
    planId: string;
    currency: string;
    amountMinor: number;
    createdByUserId: string;
  }): Promise<PlanPriceVersionView> {
    const discounts = await this.discountsOf(input.planId);
    const derived = await this.derivedEntries(
      input.planId,
      input.currency,
      input.amountMinor,
      discounts,
    );
    const minted = await this.billing.publishPriceSet({
      planId: input.planId,
      entries: [
        {
          billingInterval: BillingIntervalKind.MONTHLY,
          currency: input.currency,
          amountMinor: input.amountMinor,
          force: true,
        },
        ...derived,
      ],
      legacyDisplay: this.legacyDisplay(input.amountMinor, derived),
      createdByUserId: input.createdByUserId,
    });
    this.logger.log(
      `publishMonthly: plan=${input.planId} minted=${minted.map((price) => price.billingInterval).join(',')}`,
    );
    const monthly = minted.find((price) => price.billingInterval === BillingIntervalKind.MONTHLY);
    if (monthly === undefined) {
      throw new EntityNotFoundException('Monthly price', input.planId);
    }
    return toPriceVersionView(monthly);
  }

  /** Stores new term discounts and re-derives the longer-term prices. */
  async setDiscounts(
    planId: string,
    discounts: SetPlanIntervalDiscountsDto,
    createdByUserId: string,
  ): Promise<PlanIntervalPricingView> {
    await this.discountsOf(planId);
    const monthly = await this.billing.findActivePrice(planId, BillingIntervalKind.MONTHLY);
    if (monthly === null) {
      throw new BusinessException(
        'Publish a monthly price before setting term discounts',
        PLAN_HAS_NO_MONTHLY_PRICE,
        HttpStatus.CONFLICT,
      );
    }
    const derived = await this.derivedEntries(
      planId,
      monthly.currency,
      monthly.amountMinor,
      discounts,
    );
    const minted = await this.billing.publishPriceSet({
      planId,
      entries: derived,
      discounts,
      legacyDisplay: this.legacyDisplay(monthly.amountMinor, derived),
      createdByUserId,
    });
    this.logger.log(
      `setDiscounts: plan=${planId} minted=${minted.map((price) => price.billingInterval).join(',')}`,
    );
    return this.view(planId, discounts);
  }

  /** The plan's discounts and the ACTIVE price per interval. */
  async view(planId: string, known?: PlanIntervalDiscounts): Promise<PlanIntervalPricingView> {
    const discounts = known ?? (await this.discountsOf(planId));
    const active = await Promise.all(
      [BillingIntervalKind.MONTHLY, ...DERIVED_BILLING_INTERVALS].map((interval) =>
        this.billing.findActivePrice(planId, interval),
      ),
    );
    return {
      planId,
      discounts,
      prices: active.flatMap((price) => (price === null ? [] : [toPriceVersionView(price)])),
    };
  }

  private async discountsOf(planId: string): Promise<PlanIntervalDiscounts> {
    const plan = await this.plans.findById(planId);
    if (plan === null) {
      throw new EntityNotFoundException('Plan', planId);
    }
    return {
      quarterlyDiscountBps: plan.quarterlyDiscountBps,
      semiannualDiscountBps: plan.semiannualDiscountBps,
      yearlyDiscountBps: plan.yearlyDiscountBps,
    };
  }

  /**
   * The derived entries to mint. A plan whose monthly price is 0 (Free) does not
   * gain paid terms: only intervals that already have an active price follow it.
   */
  private async derivedEntries(
    planId: string,
    currency: string,
    monthlyMinor: number,
    discounts: PlanIntervalDiscounts,
  ): Promise<PriceSetEntry[]> {
    const wanted = deriveIntervalPrices(monthlyMinor, discounts);
    if (monthlyMinor > 0) {
      return wanted.map((price) => ({ ...price, currency, force: false }));
    }
    const existing = await Promise.all(
      wanted.map((price) => this.billing.findActivePrice(planId, price.billingInterval)),
    );
    return wanted
      .filter((_, index) => existing[index] !== null)
      .map((price) => ({ ...price, currency, force: false }));
  }

  private legacyDisplay(
    monthlyMinor: number,
    derived: readonly PriceSetEntry[],
  ): { priceMonthly: number; priceYearly: number | null } {
    const yearly = derived.find((entry) => entry.billingInterval === BillingIntervalKind.YEARLY);
    return {
      priceMonthly: monthlyMinor / 100,
      priceYearly: yearly === undefined ? null : yearly.amountMinor / 100,
    };
  }
}
