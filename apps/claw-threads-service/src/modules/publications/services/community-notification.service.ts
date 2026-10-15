import { Injectable, Logger } from '@nestjs/common';
import type { UserNotificationRequestedPayload } from '@claw/shared-types';

import { ChangeRequestDecision } from '../../../common/enums/change-request-decision.enum';
import { AuthorIdentityService } from '../../author-identity/services/author-identity.service';
import { PublicationChangeRequestsRepository } from '../repositories/publication-change-requests.repository';
import { PublicationCommentsRepository } from '../repositories/publication-comments.repository';
import type {
  CommentNotificationInput,
  CommentReactionOutcome,
  CommentReactionValue,
  CommunityActor,
} from '../types/publication-comments.types';
import {
  planChangeDecision,
  planChangeRequest,
  planCommentNotifications,
  planCommentReaction,
  planThreadReaction,
} from '../utilities/community-notification.utility';
import { ThreadNotificationService } from './thread-notification.service';

/**
 * Tells owners, repliers and mentioned people what happened in a Thread's community. Every method is
 * best effort and never throws: a person's comment or vote is already saved, and a missing
 * notification must not undo it. Failures are logged without any comment text.
 */
@Injectable()
export class CommunityNotificationService {
  private readonly logger = new Logger(CommunityNotificationService.name);

  constructor(
    private readonly identity: AuthorIdentityService,
    private readonly notifications: ThreadNotificationService,
    private readonly comments: PublicationCommentsRepository,
    private readonly requests: PublicationChangeRequestsRepository,
  ) {}

  async commentCreated(
    input: Omit<CommentNotificationInput, 'actor'> & { actorId: string },
  ): Promise<void> {
    await this.guard('comment', async () => {
      const actor = await this.actor(input.actorId);
      return planCommentNotifications({ ...input, actor });
    });
  }

  async threadReacted(
    slug: string,
    actorId: string,
    value: CommentReactionValue,
    previous: CommentReactionValue | null,
  ): Promise<void> {
    await this.guard('thread reaction', async () => {
      const publication = await this.comments.findPublicationTarget(slug);
      if (!publication?.ownerId || publication.ownerId === actorId) return [];
      const payload = planThreadReaction({
        actor: await this.actor(actorId),
        publication,
        value,
        previous,
      });
      return payload ? [payload] : [];
    });
  }

  async commentReacted(
    outcome: CommentReactionOutcome,
    actorId: string,
    value: CommentReactionValue,
  ): Promise<void> {
    await this.guard('comment reaction', async () => {
      if (value !== 'LIKE' || outcome.comment.authorId === actorId) return [];
      const payload = planCommentReaction({
        actor: await this.actor(actorId),
        publication: outcome.publication,
        comment: outcome.comment,
        value,
      });
      return payload ? [payload] : [];
    });
  }

  async changeRequested(
    slug: string,
    actorId: string,
    requestId: string,
    suggestion: string,
  ): Promise<void> {
    await this.guard('change request', async () => {
      const publication = await this.comments.findPublicationTarget(slug);
      if (!publication?.ownerId || publication.ownerId === actorId) return [];
      const payload = planChangeRequest({
        actor: await this.actor(actorId),
        publication,
        requestId,
        suggestion,
      });
      return payload ? [payload] : [];
    });
  }

  /** The owner's answer to one suggestion (accepted or declined), told to the person who made it. */
  async changeDecided(
    requestId: string,
    outcome: ChangeRequestDecision.ACCEPTED | ChangeRequestDecision.DECLINED,
  ): Promise<void> {
    await this.guard('change decision', () => this.decisionPayloads([requestId], outcome));
  }

  /** Suggestions that went live with a republish, each told to its requester once. */
  async changesApplied(requestIds: ReadonlyArray<string>): Promise<void> {
    await this.guard('applied change', () =>
      this.decisionPayloads(requestIds, ChangeRequestDecision.APPLIED),
    );
  }

  private async decisionPayloads(
    requestIds: ReadonlyArray<string>,
    outcome: ChangeRequestDecision,
  ): Promise<UserNotificationRequestedPayload[]> {
    const payloads: UserNotificationRequestedPayload[] = [];
    for (const requestId of requestIds) {
      const context = await this.requests.findDecisionContext(requestId);
      if (!context?.publication.ownerId || context.requesterId === null) continue;
      const payload = planChangeDecision({
        outcome,
        owner: await this.actor(context.publication.ownerId),
        context,
      });
      if (payload) payloads.push(payload);
    }
    return payloads;
  }

  /** The actor's display name and username; empty strings when auth-service cannot be reached. */
  private async actor(userId: string): Promise<CommunityActor> {
    const author = await this.identity.resolveOne(userId);
    return {
      id: userId,
      displayName: author?.displayName ?? '',
      username: author?.username ?? '',
    };
  }

  private async guard(
    label: string,
    plan: () => Promise<UserNotificationRequestedPayload[]>,
  ): Promise<void> {
    try {
      const payloads = await plan();
      if (payloads.length > 0) await this.notifications.dispatchBestEffort(payloads);
    } catch (error: unknown) {
      this.logger.warn(
        `Could not prepare the ${label} notification - ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
    }
  }
}
