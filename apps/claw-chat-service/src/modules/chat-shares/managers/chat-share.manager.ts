import { Injectable, Logger } from '@nestjs/common';
import { Locale } from '@claw/shared-types';

import { AppConfig } from '../../../app/config/app.config';
import { BusinessException, EntityNotFoundException } from '../../../common/errors';
import { generatePublicShareId } from '../../../common/utilities/public-share-id.utility';
import { ChatMessagesRepository } from '../../chat-messages/repositories/chat-messages.repository';
import { ChatThreadsRepository } from '../../chat-threads/repositories/chat-threads.repository';
import { DEFAULT_SHARE_TITLE, MAX_SNAPSHOT_MESSAGES } from '../constants/chat-shares.constants';
import { ChatShareErrorCode } from '../enums/chat-share-error-code.enum';
import { ChatSharesRepository } from '../repositories/chat-shares.repository';
import { ChatShareEventsService } from '../services/chat-share-events.service';
import { ChatShareMapperService } from '../services/chat-share-mapper.service';
import { buildPublicShareUrl } from '../utilities/public-share-url.utility';
import { withPublicIds } from '../utilities/publishable-message.utility';
import {
  buildShareDescription,
  buildShareTitle,
  buildSnapshotMessages,
} from '../utilities/snapshot-sanitizer.utility';
import {
  evaluateSnapshotSafety,
  resolveAdsEligibility,
} from '../utilities/snapshot-safety.utility';
import { type OwnerChatShareView, type SnapshotSafetyResult } from '../types/chat-shares.types';
import { type ChatShareEventIdentity } from '../types/chat-share-event.types';
import { type PublishShareInput, type UpdateShareInput } from '../types/chat-share-input.types';
import {
  type ChatShare,
  ChatShareSafetyStatus,
  ChatShareStatus,
  ChatShareVisibility,
} from '../../../generated/prisma';

/**
 * Owns publication, refresh, revocation and URL regeneration.
 *
 * The invariant: a message becomes public only when the owner explicitly asks
 * for it. Publishing takes a snapshot; later messages stay private until an
 * explicit refresh. That is what stops someone sharing a harmless conversation
 * and then, weeks later, unknowingly publishing what they discussed in the same
 * thread afterwards.
 */
@Injectable()
export class ChatShareManager {
  private readonly logger = new Logger(ChatShareManager.name);

  constructor(
    private readonly shares: ChatSharesRepository,
    private readonly threads: ChatThreadsRepository,
    private readonly messages: ChatMessagesRepository,
    private readonly mapper: ChatShareMapperService,
    private readonly events: ChatShareEventsService,
  ) {}

  async getForOwner(threadId: string, userId: string): Promise<OwnerChatShareView | null> {
    this.logger.debug(`getForOwner: thread=${threadId}`);
    await this.requireOwnedThread(threadId, userId);
    const share = await this.shares.findByThreadId(threadId);
    return share === null ? null : this.toOwnerView(share, threadId);
  }

  /**
   * Publishes a thread, or re-publishes one that was revoked.
   *
   * Idempotent for an already-active share: it returns the existing view rather
   * than minting a second identifier, so a double-submit cannot leave a
   * customer with two live public URLs for one conversation.
   */
  async publish(input: PublishShareInput): Promise<OwnerChatShareView> {
    this.logger.debug(`publish: thread=${input.threadId} indexed=${String(input.allowIndexing)}`);
    const thread = await this.requireOwnedThread(input.threadId, input.userId);
    const existing = await this.shares.findByThreadId(input.threadId);

    if (existing !== null && existing.status === ChatShareStatus.ACTIVE) {
      this.logger.log(`publish: thread=${input.threadId} already shared — returning existing`);
      return this.toOwnerView(existing, input.threadId);
    }

    const snapshot = await this.buildSnapshot(input.threadId);
    if (snapshot.messages.length === 0) {
      throw new BusinessException(
        'chat.share.errors.EMPTY_THREAD',
        ChatShareErrorCode.EMPTY_THREAD,
      );
    }

    const contentLocale = input.contentLocale ?? Locale.EN;
    const visibility = this.resolveVisibility(input.allowIndexing, snapshot.indexEligible);
    const now = new Date();
    // A revoked share gets a NEW identifier. Reusing the old one would make a
    // URL somebody already has resolve to content again after the owner
    // deliberately killed it.
    const publicShareId = generatePublicShareId();

    const share =
      existing === null
        ? await this.shares.create({
            threadId: input.threadId,
            ownerUserId: input.userId,
            publicShareId,
            visibility,
            safetyStatus: snapshot.safety.status,
            title: buildShareTitle(thread.title, DEFAULT_SHARE_TITLE),
            description: snapshot.description,
            messageCount: snapshot.messages.length,
            adsEligible: snapshot.adsEligible,
            indexEligible: snapshot.indexEligible,
            contentLocale,
            publishedAt: now,
            lastSnapshotAt: now,
          })
        : await this.shares.update(existing.id, {
            publicShareId,
            status: ChatShareStatus.ACTIVE,
            visibility,
            safetyStatus: snapshot.safety.status,
            title: buildShareTitle(thread.title, DEFAULT_SHARE_TITLE),
            description: snapshot.description,
            messageCount: snapshot.messages.length,
            adsEligible: snapshot.adsEligible,
            indexEligible: snapshot.indexEligible,
            contentLocale,
            publishedAt: now,
            lastSnapshotAt: now,
            revokedAt: null,
          });

    await this.shares.replaceSnapshot(share.id, withPublicIds(snapshot.messages), {
      snapshotVersion: 1,
      lastSnapshotAt: now,
    });

    this.logger.log(
      `publish: thread=${input.threadId} published visibility=${visibility} ` +
        `messages=${String(snapshot.messages.length)}`,
    );
    const identity = { shareId: share.id, threadId: input.threadId, userId: input.userId };
    this.events.published(identity, {
      visibility,
      safetyStatus: snapshot.safety.status,
      messageCount: snapshot.messages.length,
      snapshotVersion: 1,
      adsEligible: snapshot.adsEligible,
      indexEligible: snapshot.indexEligible,
    });
    this.emitSafetyRejectionIfAny(identity, snapshot.safety, input.allowIndexing);
    return this.toOwnerView({ ...share, snapshotVersion: 1 }, input.threadId);
  }

  /**
   * Republishes the thread's current history as the next snapshot version.
   *
   * The transaction in `replaceSnapshot` is what makes this safe under
   * concurrency: a reader sees the old transcript or the new one, never a
   * mixture of the two.
   */
  async refresh(threadId: string, userId: string): Promise<OwnerChatShareView> {
    this.logger.debug(`refresh: thread=${threadId}`);
    const thread = await this.requireOwnedThread(threadId, userId);
    const share = await this.requireActiveShare(threadId);
    const snapshot = await this.buildSnapshot(threadId);
    const now = new Date();

    const updated = await this.shares.replaceSnapshot(share.id, withPublicIds(snapshot.messages), {
      snapshotVersion: share.snapshotVersion + 1,
      title: buildShareTitle(thread.title, DEFAULT_SHARE_TITLE),
      description: snapshot.description,
      messageCount: snapshot.messages.length,
      safetyStatus: snapshot.safety.status,
      adsEligible: snapshot.adsEligible,
      // A refresh can move a previously-clean thread into REQUIRES_REVIEW.
      // When that happens the share drops out of the index rather than
      // staying indexed on the strength of its earlier state.
      visibility: this.resolveVisibility(
        share.visibility === ChatShareVisibility.PUBLIC_INDEXED,
        snapshot.indexEligible,
      ),
      lastSnapshotAt: now,
    });

    this.logger.log(
      `refresh: thread=${threadId} version=${String(updated.snapshotVersion)} ` +
        `messages=${String(snapshot.messages.length)}`,
    );
    const identity = { shareId: share.id, threadId, userId };
    this.events.updated(identity, {
      visibility: updated.visibility,
      safetyStatus: updated.safetyStatus,
      messageCount: updated.messageCount,
      snapshotVersion: updated.snapshotVersion,
      adsEligible: updated.adsEligible,
      indexEligible: updated.indexEligible,
    });
    this.emitSafetyRejectionIfAny(
      identity,
      snapshot.safety,
      share.visibility === ChatShareVisibility.PUBLIC_INDEXED,
    );
    return this.toOwnerView(updated, threadId);
  }

  /** Changes indexing without touching the published content. */
  async updateVisibility(input: UpdateShareInput): Promise<OwnerChatShareView> {
    this.logger.debug(`updateVisibility: thread=${input.threadId}`);
    await this.requireOwnedThread(input.threadId, input.userId);
    const share = await this.requireActiveShare(input.threadId);

    const updated = await this.shares.update(share.id, {
      visibility: this.resolveVisibility(input.allowIndexing, share.indexEligible),
    });
    this.logger.log(`updateVisibility: thread=${input.threadId} -> ${updated.visibility}`);
    this.events.visibilityChanged(
      { shareId: share.id, threadId: input.threadId, userId: input.userId },
      { previousVisibility: share.visibility, visibility: updated.visibility },
    );
    return this.toOwnerView(updated, input.threadId);
  }

  /**
   * Issues a new identifier, permanently invalidating the old URL.
   *
   * This is the owner's remedy when a link has spread further than intended. It
   * is not reversible: the previous identifier is discarded and can never
   * resolve again.
   */
  async regenerateUrl(threadId: string, userId: string): Promise<OwnerChatShareView> {
    this.logger.debug(`regenerateUrl: thread=${threadId}`);
    await this.requireOwnedThread(threadId, userId);
    const share = await this.requireActiveShare(threadId);

    const updated = await this.shares.update(share.id, {
      publicShareId: generatePublicShareId(),
    });
    this.logger.warn(`regenerateUrl: thread=${threadId} previous URL is now dead`);
    this.events.urlRegenerated({ shareId: share.id, threadId, userId }, updated.visibility);
    return this.toOwnerView(updated, threadId);
  }

  /**
   * Makes the chat private again.
   *
   * The row is REVOKED rather than deleted, which permanently spends the
   * identifier so it can never be reissued and resolve to something else. The
   * honest limit — stated to the user in the UI — is that this stops future
   * access but cannot pull the page out of a search cache or someone's copy.
   */
  async revoke(threadId: string, userId: string): Promise<void> {
    this.logger.debug(`revoke: thread=${threadId}`);
    await this.requireOwnedThread(threadId, userId);
    const share = await this.requireActiveShare(threadId);

    await this.shares.update(share.id, {
      status: ChatShareStatus.REVOKED,
      visibility: ChatShareVisibility.PRIVATE,
      adsEligible: false,
      indexEligible: false,
      revokedAt: new Date(),
    });
    this.logger.log(`revoke: thread=${threadId} is private again`);
    this.events.revoked({ shareId: share.id, threadId, userId }, share.visibility);
  }

  /**
   * Emits a safety-rejection event only when the owner actually asked for
   * indexing and the scan is what stopped it.
   *
   * Without the `allowIndexing` condition every unlisted share would emit a
   * "rejection", which would turn the audit signal into noise and hide the case
   * that matters: an owner who wanted a chat indexed and whose snapshot looks
   * like it contains a credential.
   */
  private emitSafetyRejectionIfAny(
    identity: ChatShareEventIdentity,
    safety: SnapshotSafetyResult,
    allowIndexing: boolean,
  ): void {
    if (!allowIndexing || safety.status === ChatShareSafetyStatus.APPROVED) {
      return;
    }
    this.events.safetyRejected(identity, safety.reasons, safety.status);
  }

  private async buildSnapshot(threadId: string): Promise<{
    messages: ReturnType<typeof buildSnapshotMessages>;
    description: string | null;
    safety: ReturnType<typeof evaluateSnapshotSafety>;
    adsEligible: boolean;
    indexEligible: boolean;
  }> {
    const raw = await this.messages.findAllByThreadIdAscending(threadId, MAX_SNAPSHOT_MESSAGES);
    const messages = buildSnapshotMessages(raw);
    const safety = evaluateSnapshotSafety(messages);
    return {
      messages,
      description: buildShareDescription(messages),
      safety,
      adsEligible: resolveAdsEligibility(safety.status, safety.meetsContentThreshold),
      indexEligible: safety.indexEligible,
    };
  }

  /**
   * Indexing is granted, never merely requested.
   *
   * The owner asking for it is necessary but not sufficient: a snapshot that
   * failed the safety scan or is too thin stays PUBLIC_UNLISTED. Reachable by
   * URL, absent from every search engine.
   */
  private resolveVisibility(allowIndexing: boolean, indexEligible: boolean): ChatShareVisibility {
    return allowIndexing && indexEligible
      ? ChatShareVisibility.PUBLIC_INDEXED
      : ChatShareVisibility.PUBLIC_UNLISTED;
  }

  private async requireOwnedThread(
    threadId: string,
    userId: string,
  ): Promise<{ id: string; title: string | null }> {
    const thread = await this.threads.findById(threadId);
    // A thread belonging to someone else reports NOT FOUND, not FORBIDDEN — a
    // FORBIDDEN would confirm the id exists and turn this into an oracle for
    // enumerating other users' threads.
    if (thread?.userId !== userId) {
      throw new EntityNotFoundException('ChatThread', threadId);
    }
    return thread;
  }

  private async requireActiveShare(threadId: string): Promise<ChatShare> {
    const share = await this.shares.findByThreadId(threadId);
    if (share?.status !== ChatShareStatus.ACTIVE) {
      throw new EntityNotFoundException('ChatShare', threadId);
    }
    return share;
  }

  private async toOwnerView(share: ChatShare, threadId: string): Promise<OwnerChatShareView> {
    const liveCount = await this.messages.countByThreadId(threadId);
    return this.mapper.toOwnerView(
      share,
      buildPublicShareUrl(
        AppConfig.get().PUBLIC_SITE_URL,
        share.contentLocale,
        share.publicShareId,
      ),
      // Compared against the private thread's live count so the UI can offer
      // "update shared version" instead of leaving the owner wondering why
      // their newest message is missing from the public page.
      liveCount > share.messageCount,
    );
  }
}
