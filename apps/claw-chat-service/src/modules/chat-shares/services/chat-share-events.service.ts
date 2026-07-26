import { Injectable, Logger } from '@nestjs/common';
import { RabbitMQService } from '@claw/shared-rabbitmq';
import { EventPattern } from '@claw/shared-types';

import {
  type ChatShareEventIdentity,
  type ChatShareSnapshotEventState,
  type ChatShareVisibilityTransition,
} from '../types/chat-share-event.types';

/**
 * Publishes the `chat.share.*` domain events.
 *
 * Exists as its own service so the manager stays about publication rules rather
 * than about the bus, and so there is exactly one place that decides what a
 * share event is allowed to contain.
 *
 * Two invariants hold for every method here:
 *
 * 1. **No conversation content, ever.** Not the message text, not the title,
 *    not the generated description. Audit rows and the bus both outlive a
 *    revocation, so content written here could not be taken back.
 * 2. **No public identifier.** `publicShareId` is a bearer credential for the
 *    public page; `shareId` is the internal row id and is stable across URL
 *    regeneration, which is what an audit trail actually needs.
 *
 * Publishing is fire-and-forget (`void`). A bus hiccup must not fail a
 * publication the database already committed — the consequence of dropping one
 * is a missing audit row, and the consequence of throwing would be an owner
 * told their share failed when it did not.
 */
@Injectable()
export class ChatShareEventsService {
  private readonly logger = new Logger(ChatShareEventsService.name);

  constructor(private readonly rabbit: RabbitMQService) {}

  published(identity: ChatShareEventIdentity, state: ChatShareSnapshotEventState): void {
    this.logger.debug(`published: share=${identity.shareId}`);
    this.emit(EventPattern.CHAT_SHARE_PUBLISHED, { ...identity, ...state });
  }

  updated(identity: ChatShareEventIdentity, state: ChatShareSnapshotEventState): void {
    this.logger.debug(
      `updated: share=${identity.shareId} version=${String(state.snapshotVersion)}`,
    );
    this.emit(EventPattern.CHAT_SHARE_UPDATED, { ...identity, ...state });
  }

  visibilityChanged(
    identity: ChatShareEventIdentity,
    transition: ChatShareVisibilityTransition,
  ): void {
    this.logger.debug(`visibilityChanged: share=${identity.shareId}`);
    this.emit(EventPattern.CHAT_SHARE_VISIBILITY_CHANGED, { ...identity, ...transition });
  }

  revoked(identity: ChatShareEventIdentity, previousVisibility: string): void {
    this.logger.debug(`revoked: share=${identity.shareId}`);
    this.emit(EventPattern.CHAT_SHARE_REVOKED, { ...identity, previousVisibility });
  }

  urlRegenerated(identity: ChatShareEventIdentity, visibility: string): void {
    this.logger.debug(`urlRegenerated: share=${identity.shareId}`);
    this.emit(EventPattern.CHAT_SHARE_URL_REGENERATED, { ...identity, visibility });
  }

  /**
   * A snapshot was refused indexing (or flagged) by the safety scan.
   *
   * `reasons` are the machine-readable tags from the scanner — never the matched
   * text. Emitting the matched secret would defeat the scan that found it.
   */
  safetyRejected(identity: ChatShareEventIdentity, reasons: string[], safetyStatus: string): void {
    this.logger.debug(`safetyRejected: share=${identity.shareId} reasons=${reasons.join(',')}`);
    this.emit(EventPattern.CHAT_SHARE_SAFETY_REJECTED, { ...identity, reasons, safetyStatus });
  }

  private emit(pattern: EventPattern, payload: Record<string, unknown>): void {
    void this.rabbit
      .publish(pattern, { ...payload, timestamp: new Date().toISOString() })
      .catch((error: unknown) => {
        // Swallowed on purpose: the state change is already committed and the
        // owner has been told it succeeded. Losing the audit row is the lesser
        // failure, and it is recorded here so it is not silent.
        this.logger.error(
          `emit: ${pattern} failed — ${error instanceof Error ? error.message : 'unknown'}`,
        );
      });
  }
}
