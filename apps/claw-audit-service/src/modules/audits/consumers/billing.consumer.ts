import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { RabbitMQService } from '@claw/shared-rabbitmq';

import { BILLING_AUDIT_SUBSCRIPTIONS } from '../constants/billing-audit.constants';
import { billingAuditEventSchema } from '../schemas/billing-audit-event.schema';
import { AuditsService } from '../services/audits.service';

@Injectable()
export class BillingAuditConsumer implements OnModuleInit {
  private readonly logger = new Logger(BillingAuditConsumer.name);

  constructor(
    private readonly rabbitmq: RabbitMQService,
    private readonly audits: AuditsService,
  ) {}

  async onModuleInit(): Promise<void> {
    for (const [pattern, action, severity] of BILLING_AUDIT_SUBSCRIPTIONS) {
      await this.rabbitmq.subscribe(pattern, async (raw: unknown) => {
        await this.handle(action, severity, raw);
      });
      this.logger.log(`Subscribed to event: ${pattern}`);
    }
  }

  async handleDowngraded(raw: unknown): Promise<void> {
    await this.handle('BILLING_SUBSCRIPTION_DOWNGRADED', 'MEDIUM', raw);
  }

  async handleRefunded(raw: unknown): Promise<void> {
    await this.handle('BILLING_PAYMENT_REFUNDED', 'HIGH', raw);
  }

  private async handle(
    action: string,
    severity: 'LOW' | 'MEDIUM' | 'HIGH',
    raw: unknown,
  ): Promise<void> {
    const parsed = billingAuditEventSchema.safeParse(raw);
    if (!parsed.success) {
      this.logger.error(`handle: ${action} payload failed schema validation`);
      throw new Error('invalid billing audit event');
    }
    const event = parsed.data;
    await this.audits.createAuditLog({
      userId: event.userId,
      action,
      entityType: 'subscription',
      entityId: event.subscriptionId ?? event.userId,
      severity,
      details: {
        eventId: event.eventId,
        planId: event.planId,
        planSlug: event.planSlug,
        planPriceVersionId: event.planPriceVersionId,
        previousPlanId: event.previousPlanId,
        previousPlanSlug: event.previousPlanSlug,
        previousPlanPriceVersionId: event.previousPlanPriceVersionId,
        paymentTransactionId: event.paymentTransactionId,
        refundedAmountMinor: event.refundedAmountMinor,
        currency: event.currency,
        isFullRefund: event.isFullRefund,
        effectiveAt: event.effectiveAt,
        correlationId: event.correlationId,
        causationId: event.causationId,
      },
    });
  }
}
