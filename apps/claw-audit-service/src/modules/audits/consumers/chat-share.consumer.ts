import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { RabbitMQService } from '@claw/shared-rabbitmq';
import {
  type ChatSharePublishedPayload,
  type ChatShareRevokedPayload,
  type ChatShareSafetyRejectedPayload,
  type ChatShareUpdatedPayload,
  type ChatShareUrlRegeneratedPayload,
  type ChatShareVisibilityChangedPayload,
  EventPattern,
} from '@claw/shared-types';

import {
  CHAT_SHARE_AUDIT_ACTIONS,
  CHAT_SHARE_AUDIT_ENTITY_TYPE,
} from '../constants/chat-share-audit.constants';
import { AuditsService } from '../services/audits.service';
import {
  type ChatShareAuditPayload,
  type ChatShareAuditRow,
} from '../types/chat-share-event.types';

/**
 * Audits the public chat-share lifecycle: publish, snapshot refresh, indexing
 * change, revocation, URL regeneration, and safety rejection.
 *
 * Why this matters more than a typical audit consumer: publishing a chat is the
 * one action in the product that moves private data onto the open internet. When
 * a user later reports that something sensitive was shared, this collection is
 * the only record of who published what, when, and whether the safety scan had
 * flagged it first.
 *
 * Handlers are idempotent — each writes one row derived purely from the payload,
 * so a redelivered message produces a duplicate audit row rather than corrupting
 * state. Nothing here rethrows: chat-service has already committed the state
 * change, and re-failing would only DLQ the message without undoing anything.
 *
 * The payloads contain no conversation text and no public identifier by
 * construction (see `ChatShareEventsService` in chat-service), so this consumer
 * cannot accidentally persist either.
 */
@Injectable()
export class ChatShareAuditConsumer implements OnModuleInit {
  private readonly logger = new Logger(ChatShareAuditConsumer.name);

  constructor(
    private readonly rabbitmq: RabbitMQService,
    private readonly audits: AuditsService,
  ) {}

  async onModuleInit(): Promise<void> {
    const entries: Array<[string, (raw: unknown) => Promise<void>]> = [
      [
        EventPattern.CHAT_SHARE_PUBLISHED,
        (raw) => this.handlePublished(raw as ChatSharePublishedPayload),
      ],
      [
        EventPattern.CHAT_SHARE_UPDATED,
        (raw) => this.handleUpdated(raw as ChatShareUpdatedPayload),
      ],
      [
        EventPattern.CHAT_SHARE_VISIBILITY_CHANGED,
        (raw) => this.handleVisibilityChanged(raw as ChatShareVisibilityChangedPayload),
      ],
      [
        EventPattern.CHAT_SHARE_REVOKED,
        (raw) => this.handleRevoked(raw as ChatShareRevokedPayload),
      ],
      [
        EventPattern.CHAT_SHARE_URL_REGENERATED,
        (raw) => this.handleUrlRegenerated(raw as ChatShareUrlRegeneratedPayload),
      ],
      [
        EventPattern.CHAT_SHARE_SAFETY_REJECTED,
        (raw) => this.handleSafetyRejected(raw as ChatShareSafetyRejectedPayload),
      ],
    ];
    for (const [pattern, handler] of entries) {
      await this.rabbitmq.subscribe(pattern, handler);
      this.logger.log(`Subscribed to event: ${pattern}`);
    }
  }

  private async handlePublished(payload: ChatSharePublishedPayload): Promise<void> {
    // MEDIUM, not LOW: this is the moment a private conversation becomes
    // reachable without a login.
    await this.write(payload, CHAT_SHARE_AUDIT_ACTIONS.PUBLISHED, 'MEDIUM', {
      visibility: payload.visibility,
      safetyStatus: payload.safetyStatus,
      messageCount: payload.messageCount,
      snapshotVersion: payload.snapshotVersion,
      adsEligible: payload.adsEligible,
    });
  }

  private async handleUpdated(payload: ChatShareUpdatedPayload): Promise<void> {
    await this.write(payload, CHAT_SHARE_AUDIT_ACTIONS.UPDATED, 'MEDIUM', {
      visibility: payload.visibility,
      safetyStatus: payload.safetyStatus,
      messageCount: payload.messageCount,
      snapshotVersion: payload.snapshotVersion,
      adsEligible: payload.adsEligible,
    });
  }

  private async handleVisibilityChanged(payload: ChatShareVisibilityChangedPayload): Promise<void> {
    await this.write(payload, CHAT_SHARE_AUDIT_ACTIONS.VISIBILITY_CHANGED, 'MEDIUM', {
      previousVisibility: payload.previousVisibility,
      visibility: payload.visibility,
    });
  }

  private async handleRevoked(payload: ChatShareRevokedPayload): Promise<void> {
    await this.write(payload, CHAT_SHARE_AUDIT_ACTIONS.REVOKED, 'MEDIUM', {
      previousVisibility: payload.previousVisibility,
    });
  }

  private async handleUrlRegenerated(payload: ChatShareUrlRegeneratedPayload): Promise<void> {
    // HIGH: regeneration is the remedy an owner reaches for when a link has
    // leaked. If that turns into an incident, this row is where the timeline
    // starts.
    await this.write(payload, CHAT_SHARE_AUDIT_ACTIONS.URL_REGENERATED, 'HIGH', {
      visibility: payload.visibility,
    });
  }

  private async handleSafetyRejected(payload: ChatShareSafetyRejectedPayload): Promise<void> {
    await this.write(payload, CHAT_SHARE_AUDIT_ACTIONS.SAFETY_REJECTED, 'HIGH', {
      reasons: payload.reasons,
      safetyStatus: payload.safetyStatus,
    });
  }

  private async write(
    payload: ChatShareAuditPayload,
    action: string,
    severity: ChatShareAuditRow['severity'],
    details: Record<string, unknown>,
  ): Promise<void> {
    this.logger.debug(`write: ${action} share=${payload.shareId}`);
    try {
      await this.audits.createAuditLog({
        userId: payload.userId,
        action,
        entityType: CHAT_SHARE_AUDIT_ENTITY_TYPE,
        entityId: payload.shareId,
        severity,
        details: { threadId: payload.threadId, ...details },
      });
    } catch (error) {
      this.logger.error(
        `write: ${action} share=${payload.shareId} failed — ` +
          `${error instanceof Error ? error.message : 'unknown'}`,
      );
    }
  }
}
