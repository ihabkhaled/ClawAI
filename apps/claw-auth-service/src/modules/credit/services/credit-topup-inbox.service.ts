import { Injectable, Logger } from '@nestjs/common';
import { BillingErrorCode, EventPattern } from '@claw/shared-types';

import { CreditLedgerKind } from '../../../generated/prisma';
import { EntitlementInboxRepository } from '../../entitlements/repositories/entitlement-inbox.repository';
import {
  CREDIT_TOPUP_PRODUCER,
  SUPPORTED_CREDIT_TOPUP_SCHEMA_VERSION,
} from '../constants/credit-topup-inbox.constants';
import {
  type CreditTopupReversedEvent,
  creditTopupReversedSchema,
  type CreditTopupSucceededEvent,
  creditTopupSucceededSchema,
} from '../schemas/credit-topup-event.schema';
import { CreditWalletService } from './credit-wallet.service';
import { type CreditInboxOutcome } from '../types/credit.types';

/**
 * Consumes `billing.credit.*` from the payment service.
 *
 * The SAME four guards the entitlement inbox uses, in the same order, because
 * delivery is at-least-once and every one of them is load-bearing:
 *
 *   * Zod schema    — an envelope we cannot validate is rejected, never guessed
 *   * producer      — only payment-service may put money in a wallet
 *   * schemaVersion — an envelope we do not understand is rejected, not parsed
 *   * claim(eventId)— the unique index decides which redelivery proceeds
 *
 * `sourceEventId` on the ledger row is a SECOND, independent idempotency
 * backstop: the column is UNIQUE, so even if the inbox claim were bypassed the
 * database refuses the duplicate grant. Two layers because the cost of getting
 * this wrong is free money.
 *
 * Deliberately separate from `EntitlementInboxService` rather than another
 * branch inside it: that service's job is to change a PLAN, and every path
 * through it ends at `EntitlementApplierService`. A top-up must never reach it.
 */
@Injectable()
export class CreditTopupInboxService {
  private readonly logger = new Logger(CreditTopupInboxService.name);

  constructor(
    private readonly inbox: EntitlementInboxRepository,
    private readonly wallets: CreditWalletService,
  ) {}

  async handle(pattern: string, rawPayload: unknown): Promise<CreditInboxOutcome> {
    return pattern === EventPattern.BILLING_CREDIT_TOPUP_REVERSED
      ? this.handleReversed(pattern, rawPayload)
      : this.handleSucceeded(pattern, rawPayload);
  }

  private async handleSucceeded(pattern: string, rawPayload: unknown): Promise<CreditInboxOutcome> {
    const parsed = creditTopupSucceededSchema.safeParse(rawPayload);
    if (!parsed.success) {
      this.logger.error(`handleSucceeded: rejected ${pattern} — payload failed validation`);
      return 'REJECTED_SCHEMA';
    }
    const event = parsed.data;
    const rejection = CreditTopupInboxService.rejectUntrusted(event);
    if (rejection !== null) {
      this.logger.error(`handleSucceeded: rejected ${pattern} — ${rejection}`);
      return rejection;
    }
    if (!(await this.claim(pattern, event))) {
      this.logger.debug(`handleSucceeded: duplicate ${event.eventId} ignored`);
      return 'DUPLICATE';
    }
    return this.applyGrant(event);
  }

  private async handleReversed(pattern: string, rawPayload: unknown): Promise<CreditInboxOutcome> {
    const parsed = creditTopupReversedSchema.safeParse(rawPayload);
    if (!parsed.success) {
      this.logger.error(`handleReversed: rejected ${pattern} — payload failed validation`);
      return 'REJECTED_SCHEMA';
    }
    const event = parsed.data;
    const rejection = CreditTopupInboxService.rejectUntrusted(event);
    if (rejection !== null) {
      this.logger.error(`handleReversed: rejected ${pattern} — ${rejection}`);
      return rejection;
    }
    if (!(await this.claim(pattern, event))) {
      this.logger.debug(`handleReversed: duplicate ${event.eventId} ignored`);
      return 'DUPLICATE';
    }
    return this.applyReversal(event);
  }

  private async applyGrant(event: CreditTopupSucceededEvent): Promise<CreditInboxOutcome> {
    try {
      const wallet = await this.wallets.ensure(event.userId);
      await this.wallets.applyCredit({
        userId: event.userId,
        walletId: wallet.id,
        amountMicroUsd: BigInt(event.creditMicroUsd),
        kind: CreditLedgerKind.TOPUP,
        // PURCHASED, never GRANT: bought credit does not expire at the period
        // roll. Crediting GRANT would silently confiscate it at month end.
        toGrant: false,
        // UNIQUE in the database. The idempotency backstop behind the claim.
        sourceEventId: event.eventId,
        actorUserId: null,
        reason: `Credit top-up ${event.packageId}`,
      });
      await this.inbox.markProcessed(event.eventId);
      this.logger.log(`applyGrant: credited user=${event.userId} package=${event.packageId}`);
      return 'APPLIED';
    } catch (error) {
      return this.recordFailure(event.eventId, error);
    }
  }

  /**
   * Applies a reversal, CLAMPED to the unspent PURCHASED balance.
   *
   * A clamped reversal is APPLIED, not FAILED. It has landed for everything the
   * wallet still held, and reporting failure would have the reconciliation
   * sweep retry a reversal that can never take any more — spent credit is
   * consumed irreversibly and is not refundable (ADR-083 edge case E5).
   */
  private async applyReversal(event: CreditTopupReversedEvent): Promise<CreditInboxOutcome> {
    try {
      const wallet = await this.wallets.ensure(event.userId);
      const outcome = await this.wallets.applyTopupReversal({
        userId: event.userId,
        walletId: wallet.id,
        amountMicroUsd: BigInt(event.creditMicroUsd),
        sourceEventId: event.eventId,
        reason: event.isChargeback
          ? `Charged-back top-up ${event.packageId}`
          : `Refunded top-up ${event.packageId}`,
      });
      await this.inbox.markProcessed(event.eventId);
      if (outcome.shortfallMicroUsd > 0n) {
        // The code, never the figure next to the user id: a log pairing a
        // balance with an identity is a list of who is worth targeting.
        this.logger.error(
          `applyReversal: ${BillingErrorCode.CREDIT_REVERSAL_EXCEEDS_UNSPENT} ` +
            `event=${event.eventId}`,
        );
        return 'REVERSAL_CLAMPED';
      }
      this.logger.warn(`applyReversal: reversed user=${event.userId} package=${event.packageId}`);
      return 'APPLIED';
    } catch (error) {
      return this.recordFailure(event.eventId, error);
    }
  }

  private async claim(
    pattern: string,
    event: {
      eventId: string;
      schemaVersion: number;
      producer: string;
      userId: string;
      occurredAt: string;
    },
  ): Promise<boolean> {
    return this.inbox.claim({
      eventId: event.eventId,
      eventType: pattern,
      schemaVersion: event.schemaVersion,
      producer: event.producer,
      userId: event.userId,
      // Stored verbatim so a failed apply is replayed from exactly what was
      // received, not from a lossy re-derivation.
      payloadJson: { ...event },
      // The credit envelope has no `effectiveAt` because a top-up has no
      // ordering against entitlement state — it is money in, once.
      effectiveAt: new Date(event.occurredAt),
    });
  }

  private async recordFailure(eventId: string, error: unknown): Promise<CreditInboxOutcome> {
    const message = error instanceof Error ? error.message : 'unknown';
    // FAILED, not deleted: the row is the record that we saw this event, and
    // the reconciliation sweep retries it rather than losing the money.
    await this.inbox.markFailed(eventId, message.slice(0, 200));
    this.logger.error(`recordFailure: ${eventId} failed — ${message}`);
    return 'FAILED';
  }

  // Deliberately does NOT take the routing pattern: trust is decided by the
  // envelope's producer and schema version, never by the routing key, which any
  // publisher on the exchange can choose.
  private static rejectUntrusted(event: {
    producer: string;
    schemaVersion: number;
  }): CreditInboxOutcome | null {
    if (event.producer !== CREDIT_TOPUP_PRODUCER) {
      return 'REJECTED_PRODUCER';
    }
    if (event.schemaVersion !== SUPPORTED_CREDIT_TOPUP_SCHEMA_VERSION) {
      return 'REJECTED_VERSION';
    }
    return null;
  }
}
