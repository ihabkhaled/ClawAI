import { Injectable, Logger } from '@nestjs/common';

import {
  PAYMENT_SERVICE_PRODUCER,
  SUPPORTED_BILLING_SCHEMA_VERSION,
} from '../constants/entitlement-inbox.constants';
import { EntitlementInboxRepository } from '../repositories/entitlement-inbox.repository';
import { EntitlementApplierService } from './entitlement-applier.service';
import { billingEventSchema } from '../schemas/billing-event.schema';
import { type InboxApplyOutcome } from '../types/entitlement-inbox.types';

// Consumes billing events from the payment service.
//
// Delivery is at-least-once (a transactional outbox cannot be exactly-once
// across a database and a broker), so every guard here matters:
//
//   * unique eventId  — a redelivered event is recorded once and skipped
//   * schema version  — an envelope we do not understand is parked, not guessed
//   * producer check  — a paid activation must come from the payment service
//   * effectiveAt     — a late-arriving OLD event must not overwrite newer state
//
// The last one is the subtle one. Events can arrive out of order after a broker
// retry, and applying a stale "activated" over a newer "cancelled" would hand
// back access the user no longer has.
@Injectable()
export class EntitlementInboxService {
  private readonly logger = new Logger(EntitlementInboxService.name);

  constructor(
    private readonly repository: EntitlementInboxRepository,
    private readonly applier: EntitlementApplierService,
  ) {}

  async handle(pattern: string, rawPayload: unknown): Promise<InboxApplyOutcome> {
    const parsed = billingEventSchema.safeParse(rawPayload);
    if (!parsed.success) {
      // Never guess at an envelope we cannot validate — entitlement is a
      // security decision, not a best-effort projection.
      this.logger.error(`handle: rejected ${pattern} — payload failed schema validation`);
      return 'REJECTED_SCHEMA';
    }
    const event = parsed.data;

    if (event.producer !== PAYMENT_SERVICE_PRODUCER) {
      this.logger.error(`handle: rejected ${pattern} — untrusted producer ${event.producer}`);
      return 'REJECTED_PRODUCER';
    }
    if (event.schemaVersion !== SUPPORTED_BILLING_SCHEMA_VERSION) {
      this.logger.error(
        `handle: rejected ${pattern} — unsupported schemaVersion ${String(event.schemaVersion)}`,
      );
      return 'REJECTED_VERSION';
    }

    // Claim first. createMany({ skipDuplicates }) makes the unique eventId the
    // de-duplication point, so a redelivery loses the race and does nothing.
    const claimed = await this.repository.claim({
      eventId: event.eventId,
      eventType: pattern,
      schemaVersion: event.schemaVersion,
      producer: event.producer,
      userId: event.userId,
      // Stored verbatim so a failed apply can be replayed from exactly what was
      // received, rather than from a lossy re-derivation.
      payloadJson: { ...event },
      effectiveAt: new Date(event.effectiveAt),
    });
    if (!claimed) {
      this.logger.debug(`handle: duplicate ${event.eventId} ignored`);
      return 'DUPLICATE';
    }

    return this.applyClaimed(pattern, event);
  }

  private async applyClaimed(
    pattern: string,
    event: {
      eventId: string;
      userId: string;
      effectiveAt: string;
      entitlementValidUntil: string;
      planId?: string;
      subscriptionId?: string;
    },
  ): Promise<InboxApplyOutcome> {
    try {
      const applied = await this.applier.apply({
        pattern,
        userId: event.userId,
        planId: event.planId ?? null,
        subscriptionId: event.subscriptionId ?? null,
        effectiveAtMs: new Date(event.effectiveAt).getTime(),
        entitlementValidUntilMs: new Date(event.entitlementValidUntil).getTime(),
        sourceEventId: event.eventId,
      });
      await this.repository.markProcessed(event.eventId);
      if (!applied) {
        this.logger.warn(`applyClaimed: ${event.eventId} skipped — newer state already applied`);
        return 'SKIPPED_STALE';
      }
      this.logger.log(`applyClaimed: ${pattern} applied for user=${event.userId}`);
      return 'APPLIED';
    } catch (error) {
      // FAILED, not deleted: the row is the record that we saw this event, and
      // the reconciliation sweep retries it rather than losing it.
      await this.repository.markFailed(event.eventId, (error as Error).message.slice(0, 200));
      this.logger.error(`applyClaimed: ${event.eventId} failed — ${(error as Error).message}`);
      return 'FAILED';
    }
  }
}
