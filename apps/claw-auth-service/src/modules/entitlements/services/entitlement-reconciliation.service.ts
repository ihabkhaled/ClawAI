import { Injectable, Logger } from '@nestjs/common';
import { EventPattern } from '@claw/shared-types';

import {
  PAYMENT_SERVICE_PRODUCER,
  SUPPORTED_BILLING_SCHEMA_VERSION,
} from '../constants/entitlement-inbox.constants';
import { PaymentEntitlementClient } from '../clients/payment-entitlement.client';
import { EntitlementInboxRepository } from '../repositories/entitlement-inbox.repository';
import {
  type BillingEntitlementReconcileRequest,
  billingEntitlementReconcileRequestSchema,
} from '../schemas/payment-entitlement.schema';
import type { InboxApplyOutcome } from '../types/entitlement-inbox.types';
import { EntitlementApplierService } from './entitlement-applier.service';

@Injectable()
export class EntitlementReconciliationService {
  private readonly logger = new Logger(EntitlementReconciliationService.name);

  constructor(
    private readonly repository: EntitlementInboxRepository,
    private readonly client: PaymentEntitlementClient,
    private readonly applier: EntitlementApplierService,
  ) {}

  async handle(rawPayload: unknown): Promise<InboxApplyOutcome> {
    const parsed = billingEntitlementReconcileRequestSchema.safeParse(rawPayload);
    if (!parsed.success) {
      this.logger.error('handle: reconcile request failed schema validation');
      return 'REJECTED_SCHEMA';
    }
    const event = parsed.data;
    if (event.producer !== PAYMENT_SERVICE_PRODUCER) {
      this.logger.error(`handle: reconcile request has untrusted producer ${event.producer}`);
      return 'REJECTED_PRODUCER';
    }
    if (event.schemaVersion !== SUPPORTED_BILLING_SCHEMA_VERSION) {
      this.logger.error(
        `handle: unsupported reconcile schemaVersion ${String(event.schemaVersion)}`,
      );
      return 'REJECTED_VERSION';
    }
    const claimed = await this.claim(event);
    if (!claimed) {
      return 'DUPLICATE';
    }
    return this.apply(event.eventId, event.userId);
  }

  private async claim(event: BillingEntitlementReconcileRequest): Promise<boolean> {
    const created = await this.repository.claim({
      eventId: event.eventId,
      eventType: EventPattern.BILLING_ENTITLEMENT_RECONCILE_REQUESTED,
      schemaVersion: event.schemaVersion,
      producer: event.producer,
      userId: event.userId,
      payloadJson: { ...event },
      effectiveAt: new Date(event.occurredAt),
    });
    return created || this.repository.retryFailed(event.eventId);
  }

  private async apply(eventId: string, userId: string): Promise<InboxApplyOutcome> {
    try {
      const state = await this.client.getAuthoritativeEntitlement(userId);
      const pattern = state.hasPaidEntitlement
        ? EventPattern.BILLING_SUBSCRIPTION_RENEWED
        : EventPattern.BILLING_SUBSCRIPTION_EXPIRED;
      const applied = await this.applier.apply({
        pattern,
        userId,
        planId: state.planId,
        subscriptionId: state.subscriptionId,
        effectiveAtMs: new Date(state.effectiveAt).getTime(),
        entitlementValidUntilMs: new Date(state.entitlementValidUntil).getTime(),
        sourceEventId: eventId,
      });
      await this.repository.markProcessed(eventId);
      return applied ? 'APPLIED' : 'SKIPPED_STALE';
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown reconciliation failure';
      await this.repository.markFailed(eventId, message.slice(0, 200));
      this.logger.error(`apply: entitlement reconciliation failed: ${message}`);
      throw error;
    }
  }
}
