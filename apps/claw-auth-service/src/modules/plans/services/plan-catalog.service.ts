import { Injectable, Logger } from '@nestjs/common';

import { EntityNotFoundException } from '../../../common/errors';
import { type BillingIntervalKind } from '../../../generated/prisma';
import { PlanBillingRepository } from '../repositories/plan-billing.repository';
import { PlansRepository } from '../repositories/plans.repository';
import {
  type PlanCatalogEntry,
  type PlanFeatureRuleView,
  type PlanPriceVersionView,
} from '../types/plan-catalog.types';
import {
  toCatalogEntry,
  toFeatureRuleView,
  toPriceVersionView,
} from '../utilities/plan-catalog.utility';

/**
 * Serves the plan catalog to the payment service.
 *
 * Auth owns prices; payment owns charges. Keeping the price here — as an
 * immutable, versioned row that payment references by id rather than copies —
 * is what makes it impossible for a repricing to rewrite what an existing
 * subscriber already agreed to pay.
 */
@Injectable()
export class PlanCatalogService {
  private readonly logger = new Logger(PlanCatalogService.name);

  constructor(
    private readonly plans: PlansRepository,
    private readonly billing: PlanBillingRepository,
  ) {}

  async listCatalog(): Promise<PlanCatalogEntry[]> {
    this.logger.debug('listCatalog');
    const [plans, prices] = await Promise.all([
      this.plans.findAll(),
      this.billing.listActivePrices(),
    ]);

    // Only plans a customer may actually buy. An inactive or private plan can
    // still back an existing subscription, but it must never be offered.
    const purchasable = plans.filter((plan) => plan.isActive && plan.isPublic);

    const entries = await Promise.all(
      purchasable.map(async (plan) => {
        const rules = await this.billing.listFeatureRules(plan.id);
        return toCatalogEntry(
          plan,
          prices.filter((price) => price.planId === plan.id).map(toPriceVersionView),
          rules.map(toFeatureRuleView),
        );
      }),
    );

    this.logger.debug(`listCatalog: ${String(entries.length)} purchasable plans`);
    return entries;
  }

  /**
   * The active price for a plan and interval, or null.
   *
   * Returning null rather than throwing is deliberate: the caller is a checkout
   * flow, and "this plan has no price for that interval" is a business answer
   * it must handle, not an exception it should surface as a 500.
   */
  async findActivePrice(
    planId: string,
    billingInterval: BillingIntervalKind,
  ): Promise<PlanPriceVersionView | null> {
    this.logger.debug(`findActivePrice: plan=${planId} interval=${billingInterval}`);
    const price = await this.billing.findActivePrice(planId, billingInterval);
    return price === null ? null : toPriceVersionView(price);
  }

  /**
   * Resolves a specific price version by id, active or retired.
   *
   * Proration and invoice reproduction need the version a subscriber actually
   * bought, which is usually no longer the active one.
   */
  async findPriceVersion(id: string): Promise<PlanPriceVersionView | null> {
    this.logger.debug(`findPriceVersion: ${id}`);
    const price = await this.billing.findPriceById(id);
    return price === null ? null : toPriceVersionView(price);
  }

  async listPriceVersions(planId: string): Promise<PlanPriceVersionView[]> {
    await this.requirePlan(planId);
    const prices = await this.billing.listPricesForPlan(planId);
    return prices.map(toPriceVersionView);
  }

  async publishPrice(input: {
    planId: string;
    billingInterval: BillingIntervalKind;
    currency: string;
    amountMinor: number;
    createdByUserId: string;
  }): Promise<PlanPriceVersionView> {
    await this.requirePlan(input.planId);
    const price = await this.billing.publishNewPrice(input);
    this.logger.log(
      `publishPrice: plan=${input.planId} interval=${input.billingInterval} version=${String(price.version)}`,
    );
    return toPriceVersionView(price);
  }

  async listFeatureRules(planId: string): Promise<PlanFeatureRuleView[]> {
    this.logger.debug(`listFeatureRules: plan=${planId}`);
    const rules = await this.billing.listFeatureRules(planId);
    return rules.map(toFeatureRuleView);
  }

  private async requirePlan(planId: string): Promise<void> {
    const plan = await this.plans.findById(planId);
    if (plan === null) {
      throw new EntityNotFoundException('Plan', planId);
    }
  }
}
