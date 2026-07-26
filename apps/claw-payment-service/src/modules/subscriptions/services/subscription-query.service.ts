import { Injectable, Logger } from '@nestjs/common';

import { InvoiceRepository } from '../repositories/invoice.repository';
import { PaymentMethodRepository } from '../repositories/payment-method.repository';
import { SubscriptionRepository } from '../repositories/subscription.repository';
import { PlanCatalogClient } from '../../plan-catalog/plan-catalog.client';
import {
  type CurrentSubscriptionView,
  type InvoiceView,
  type PaymentMethodView,
} from '../types/subscription-view.types';
import {
  toCurrentSubscriptionView,
  toInvoiceView,
  toPaymentMethodView,
} from '../utilities/subscription-view.utility';

/**
 * Read side of a customer's own billing state.
 *
 * Everything is scoped by the userId from the verified JWT, at the query rather
 * than by filtering afterwards — a missed ownership check would otherwise
 * return somebody else's billing history.
 */
@Injectable()
export class SubscriptionQueryService {
  private readonly logger = new Logger(SubscriptionQueryService.name);

  constructor(
    private readonly subscriptions: SubscriptionRepository,
    private readonly invoices: InvoiceRepository,
    private readonly methods: PaymentMethodRepository,
    private readonly catalog: PlanCatalogClient,
  ) {}

  /**
   * The user's current subscription, or null.
   *
   * null is a valid answer, not an error: it is what every free account looks
   * like. Returning a 404 here would make the billing page treat the most
   * common state as a failure.
   */
  async findCurrent(userId: string): Promise<CurrentSubscriptionView | null> {
    this.logger.debug(`findCurrent: user=${userId}`);
    const subscription = await this.subscriptions.findActiveByUserId(userId);
    if (subscription === null) {
      return null;
    }
    const planName = await this.resolvePlanName(subscription.planId);
    return toCurrentSubscriptionView(subscription, planName);
  }

  async listInvoices(userId: string): Promise<InvoiceView[]> {
    this.logger.debug(`listInvoices: user=${userId}`);
    const invoices = await this.invoices.listForUser(userId);
    return invoices.map(toInvoiceView);
  }

  async listPaymentMethods(userId: string): Promise<PaymentMethodView[]> {
    this.logger.debug(`listPaymentMethods: user=${userId}`);
    const methods = await this.methods.listActiveForUser(userId);
    return methods.map(toPaymentMethodView);
  }

  // The display name lives in auth-service. A failure there must not take the
  // billing page down with it — the view falls back to the plan slug.
  private async resolvePlanName(planId: string): Promise<string | null> {
    try {
      const catalog = await this.catalog.listCatalog();
      return catalog.find((entry) => entry.id === planId)?.name ?? null;
    } catch (error: unknown) {
      this.logger.warn(
        `resolvePlanName: catalog unavailable, falling back to slug — ` +
          `${error instanceof Error ? error.message : 'unknown'}`,
      );
      return null;
    }
  }
}
