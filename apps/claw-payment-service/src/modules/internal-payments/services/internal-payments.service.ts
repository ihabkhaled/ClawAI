import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import {
  type AuthoritativeBillingEntitlement,
  type InternalPaymentStatus,
  type InternalSubscriptionStatus,
  SubscriptionStatus,
} from '@claw/shared-types';

import { BusinessException } from '../../../common/errors';
import { hasActiveEntitlement } from '../../../common/utilities/subscription-state-machine.utility';
import { FREE_PLAN_SLUG } from '../constants/internal-payments.constants';
import { InternalPaymentsRepository } from '../repositories/internal-payments.repository';
import {
  authoritativeBillingEntitlementResponseSchema,
  internalPaymentStatusResponseSchema,
  internalSubscriptionStatusResponseSchema,
} from '../schemas/internal-payments-response.schema';

@Injectable()
export class InternalPaymentsService {
  private readonly logger = new Logger(InternalPaymentsService.name);

  constructor(private readonly repository: InternalPaymentsRepository) {}

  async getPaymentStatus(id: string): Promise<InternalPaymentStatus> {
    const payment = await this.repository.findPaymentById(id);
    if (payment === null) {
      throw this.notFound();
    }
    return internalPaymentStatusResponseSchema.parse({
      paymentTransactionId: payment.id,
      subscriptionId: payment.subscriptionId,
      userId: payment.userId,
      gateway: payment.gateway,
      type: payment.type,
      status: payment.status,
      amountMinor: payment.amountMinor,
      currency: payment.currency,
      capturedAt: payment.capturedAt?.toISOString() ?? null,
      createdAt: payment.createdAt.toISOString(),
      updatedAt: payment.updatedAt.toISOString(),
    });
  }

  async getSubscriptionStatus(id: string): Promise<InternalSubscriptionStatus> {
    const subscription = await this.repository.findSubscriptionById(id);
    if (subscription === null) {
      throw this.notFound();
    }
    return internalSubscriptionStatusResponseSchema.parse({
      subscriptionId: subscription.id,
      userId: subscription.userId,
      planId: subscription.planId,
      planSlug: subscription.planSlug,
      planPriceVersionId: subscription.planPriceVersionId,
      gateway: subscription.gateway,
      status: subscription.status,
      billingInterval: subscription.billingInterval,
      entitlementValidUntil: subscription.entitlementValidUntil.toISOString(),
      gracePeriodEndsAt: subscription.gracePeriodEndsAt?.toISOString() ?? null,
      updatedAt: subscription.updatedAt.toISOString(),
    });
  }

  async getAuthoritativeEntitlement(
    userId: string,
    now: Date = new Date(),
  ): Promise<AuthoritativeBillingEntitlement> {
    this.logger.debug(`getAuthoritativeEntitlement: user=${userId}`);
    const subscription = await this.repository.findAuthoritativeSubscriptionForUser(userId);
    if (subscription === null) {
      return this.freeEntitlement(userId, null, null, now);
    }
    const status = subscription.status as SubscriptionStatus;
    const entitled = hasActiveEntitlement(
      status,
      subscription.entitlementValidUntil.getTime(),
      subscription.gracePeriodEndsAt?.getTime() ?? null,
      now.getTime(),
    );
    if (!entitled) {
      return this.freeEntitlement(userId, subscription.id, status, now);
    }
    return authoritativeBillingEntitlementResponseSchema.parse({
      userId,
      subscriptionId: subscription.id,
      hasPaidEntitlement: true,
      planId: subscription.planId,
      planSlug: subscription.planSlug,
      planPriceVersionId: subscription.planPriceVersionId,
      subscriptionStatus: status,
      effectiveAt: now.toISOString(),
      entitlementValidUntil: subscription.entitlementValidUntil.toISOString(),
    });
  }

  private freeEntitlement(
    userId: string,
    subscriptionId: string | null,
    status: SubscriptionStatus | null,
    now: Date,
  ): AuthoritativeBillingEntitlement {
    const effectiveAt = now.toISOString();
    return authoritativeBillingEntitlementResponseSchema.parse({
      userId,
      subscriptionId,
      hasPaidEntitlement: false,
      planId: null,
      planSlug: FREE_PLAN_SLUG,
      planPriceVersionId: null,
      subscriptionStatus: status,
      effectiveAt,
      entitlementValidUntil: effectiveAt,
    });
  }

  private notFound(): BusinessException {
    return new BusinessException(
      'errors.billingRecord.notFound',
      'ENTITY_NOT_FOUND',
      HttpStatus.NOT_FOUND,
    );
  }
}
