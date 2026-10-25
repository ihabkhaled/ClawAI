import {
  BadRequestException,
  ConflictException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';

import { PublicationStatus } from '../../../generated/prisma';
import { PublicationChangeRequestsRepository } from '../repositories/publication-change-requests.repository';
import { CommunityNotificationService } from './community-notification.service';
import { BoardIndexService } from '../../board-index/services/board-index.service';
import { PublicationsRepository } from '../repositories/publications.repository';
import { ThreadNotificationService } from './thread-notification.service';
import { GenerationStartGate } from './generation-start-gate.service';
import { ThreadGenerationErrorCode } from '../../../common/enums/thread-generation-error-code.enum';
import { codedErrorBody } from '../../../common/utilities/coded-error-body.utility';
import {
  ACTIVE_GENERATION_JOB_STATUSES,
  PUBLISHABLE_PUBLICATION_STATUSES,
} from '../constants/publication-generation-owner.constants';
import { GenerationPreflightService } from './generation-preflight.service';
import { HealingPoolService } from './healing-pool.service';
import { ThreadsGenerationClient } from './threads-generation.client';
import type { EditPublicationRevisionDto } from '../dto/edit-publication-revision.dto';
import type { StartThreadGenerationDto } from '../dto/start-thread-generation.dto';
import { encodeVerifiedToon } from '../../../common/utilities/toon.utility';
import { PublicationExportFormat } from '../../../common/enums/publication-export-format.enum';
import type {
  EditedRevisionRecord,
  OwnedRevisionReviewRecord,
  PublicationEditResult,
  PublicationExport,
  PublicationRevisionReviewState,
  PublicationStartIdentity,
  PublishedPublication,
  RevisionReviewSaver,
} from '../types/publication.types';
import type { PublicationSafetyFinding } from '../types/publication-safety.types';
import type { PrivateGenerationState } from '../types/generation.types';
import { describePublicationSafety } from '../utilities/publication-safety.utility';
import { withLatestRevision } from '../utilities/latest-revision-state.utility';
import {
  MIN_PUBLICATION_CRITIC_SCORE,
  MIN_PUBLICATION_JUDGE_SCORE,
} from '../constants/publication-review.constants';

@Injectable()
export class PublicationLifecycleService {
  private readonly logger = new Logger(PublicationLifecycleService.name);

  constructor(
    private readonly publications: PublicationsRepository,
    private readonly generation: ThreadsGenerationClient,
    private readonly notifications: ThreadNotificationService,
    private readonly gate: GenerationStartGate,
    @Optional() private readonly boardIndex?: BoardIndexService,
    @Optional() private readonly preflight?: GenerationPreflightService,
    @Optional() private readonly healingPool?: HealingPoolService,
    @Optional() private readonly changeRequests?: PublicationChangeRequestsRepository,
    @Optional() private readonly communityNotices?: CommunityNotificationService,
  ) {}

  listOwned(ownerId: string): ReturnType<PublicationsRepository['findOwnedPublications']> {
    return this.publications.findOwnedPublications(ownerId);
  }

  /**
   * Queues the job, then its publication. The two live in different services, so the second step
   * failing must undo the first: the job is cancelled upstream (which releases its budget and
   * feature allowance) unless some publication already points at it. A job is never left queued
   * with no owner to see it.
   */
  async enqueueGeneration(
    ownerId: string,
    input: StartThreadGenerationDto,
    identity?: PublicationStartIdentity,
  ): Promise<{ publicationId: string; jobId: string; status: string }> {
    const healing = await this.healingPool?.forOwner(ownerId);
    const job = await this.generation.enqueue(ownerId, input, healing);
    const endAttach = this.gate.beginAttach(job.jobId);
    try {
      const publication = await this.publications.createQueuedPublication(
        ownerId,
        job.jobId,
        input,
        identity,
      );
      if (!publication) throw new ConflictException('Generation job owner mismatch');
      return { publicationId: publication.id, jobId: job.jobId, status: job.status };
    } catch (error: unknown) {
      await this.releaseUnattachedJob(job.jobId);
      throw error;
    } finally {
      endAttach();
    }
  }

  /** Best effort and never masks the original error; the orphan repair covers a cancel that fails. */
  private async releaseUnattachedJob(jobId: string): Promise<void> {
    try {
      if (await this.publications.findByGenerationJobId(jobId)) return;
      await this.generation.cancel(jobId);
    } catch {
      this.logger.warn(`Generation job ${jobId} could not be released after a failed start`);
    }
  }

  async getGenerationState(
    publicationId: string,
    ownerId: string,
  ): Promise<{
    publicationId: string;
    publicationStatus: string;
    /** The owner may press Publish now: a reviewed draft, or an unpublished article again. */
    canPublish: boolean;
    /** True when the publish would bring back an article the owner unpublished. */
    canRepublish: boolean;
    jobId: string;
    status: string;
    stage: string;
    round: number;
    safeErrorCode: string | null;
    terminal: boolean;
    /** Set when the safety scan blocked the newest revision: what was flagged, for the editor. */
    safetyBlock: { reasons: string[]; findings: PublicationSafetyFinding[] } | null;
    draft: {
      markdown: string;
      citations: Array<{ evidenceId: string; url: string }>;
      judgeScore: number;
      criticScore: number;
    } | null;
  }> {
    const publication = await this.publications.findOwnedGeneration(publicationId, ownerId);
    if (!publication?.generationJobId) throw new NotFoundException('Publication not found');
    const state = await this.generation.getPrivateState(publication.generationJobId, ownerId);
    let publicationStatus: PublicationStatus = publication.status;
    if (state.status === 'WAITING_FOR_REVIEW' && state.draft) {
      await this.publications.savePrivateDraft(publicationId, state.draft);
      publicationStatus =
        (await this.publications.findOwnedGeneration(publicationId, ownerId))?.status ??
        publicationStatus;
    }
    const withEdit = await this.withPublishableDraft(publicationId, ownerId, state);
    const { current, safetyBlock } = await this.withSafetyBlock(publicationId, ownerId, withEdit);
    return {
      publicationId,
      publicationStatus,
      safetyBlock,
      canPublish:
        PUBLISHABLE_PUBLICATION_STATUSES.includes(publicationStatus) &&
        (await this.publications.hasPublishableRevision(publicationId, ownerId)),
      canRepublish:
        publicationStatus === PublicationStatus.UNPUBLISHED &&
        (await this.publications.hasPublishableRevision(publicationId, ownerId)),
      ...current,
    };
  }

  /**
   * A draft the safety scan blocked can never publish; the owner must see what was flagged and edit
   * from the newest stored text (their last edit, not the original draft).
   */
  private async withSafetyBlock(
    publicationId: string,
    ownerId: string,
    state: PrivateGenerationState,
  ): Promise<{
    current: PrivateGenerationState;
    safetyBlock: { reasons: string[]; findings: PublicationSafetyFinding[] } | null;
  }> {
    if (!state.draft) return { current: state, safetyBlock: null };
    const latest = await this.publications.findLatestRevisionSafety(publicationId, ownerId);
    if (!latest?.blocked) return { current: state, safetyBlock: null };
    const report = describePublicationSafety(
      latest.markdown,
      latest.citations.map(({ url }) => url),
    );
    return {
      current: {
        ...state,
        draft: { ...state.draft, markdown: latest.markdown, citations: latest.citations },
      },
      safetyBlock: { reasons: report.reasons, findings: report.findings },
    };
  }

  /** After a passing edit the owner publishes the edit, so its draft and hash replace the original. */
  private async withPublishableDraft(
    publicationId: string,
    ownerId: string,
    state: PrivateGenerationState,
  ): Promise<PrivateGenerationState> {
    if (!state.draft) return state;
    const latest = await this.publications.findLatestPublishableRevision(publicationId, ownerId);
    return latest ? withLatestRevision(state, latest) : state;
  }

  /**
   * Asks the generation service to stop a queued or running generation. Anything else is a 409
   * that says what state the generation is really in, instead of pretending a cancel was queued.
   */
  async cancelGeneration(
    publicationId: string,
    ownerId: string,
  ): Promise<{ publicationId: string; status: 'CANCEL_REQUESTED' }> {
    const publication = await this.publications.findOwnedGeneration(publicationId, ownerId);
    if (!publication?.generationJobId) throw new NotFoundException('Publication not found');
    const state = await this.generation.getPrivateState(publication.generationJobId, ownerId);
    if (
      publication.status !== PublicationStatus.DRAFT ||
      !ACTIVE_GENERATION_JOB_STATUSES.includes(state.status)
    ) {
      throw new ConflictException(
        codedErrorBody(
          'Only a queued or running generation can be cancelled.',
          ThreadGenerationErrorCode.NOT_CANCELLABLE,
          HttpStatus.CONFLICT,
          { state: state.status, publicationStatus: publication.status },
        ),
      );
    }
    await this.generation.cancel(publication.generationJobId);
    return { publicationId, status: 'CANCEL_REQUESTED' };
  }

  async approveAndPublish(publicationId: string, ownerId: string): Promise<PublishedPublication> {
    let outcome = await this.publications.publishReadyRevision(publicationId, ownerId);
    if (outcome?.kind === 'NOT_READY' && (await this.recordFinishedDraft(publicationId, ownerId))) {
      // Progress said WAITING_FOR_REVIEW before the draft was saved here: save it, then decide.
      outcome = await this.publications.publishReadyRevision(publicationId, ownerId);
    }
    if (!outcome) throw new NotFoundException('Publication not found');
    if (outcome.kind === 'REVOKED') {
      throw new ConflictException(
        'This publication was removed by moderation and cannot be published.',
      );
    }
    if (outcome.kind === 'NOT_READY') {
      throw new ConflictException(
        'This publication has no approved revision ready to publish. Wait for the review to finish, or edit it first.',
      );
    }
    // Also on a repeat or a republish: the visible revision may have changed, and a sync is idempotent.
    await this.syncBoard(publicationId);
    await this.applyAcceptedSuggestions(publicationId);
    // A repeated publish of a live article answers with it again and tells nobody twice.
    if (outcome.newlyPublished) {
      try {
        await this.notifications.notifyPublished(ownerId, outcome.publication);
      } catch {
        // The article is live either way; a lost notice must not turn an approval into an error.
        this.logger.warn('Publish notification could not be sent');
      }
    }
    return outcome.publication;
  }

  /**
   * Suggestions the owner accepted become APPLIED once the live revision contains them, and each
   * requester is told. Best effort: the article is already live, and the status move is repeatable.
   */
  private async applyAcceptedSuggestions(publicationId: string): Promise<void> {
    if (!this.changeRequests) return;
    try {
      const applied = await this.changeRequests.markAcceptedApplied(publicationId);
      if (applied.length > 0) await this.communityNotices?.changesApplied(applied);
    } catch {
      this.logger.warn('Applied suggestions could not be recorded');
    }
  }

  /**
   * The draft is stored only when its state is read, so a publish that comes right after progress
   * reports WAITING_FOR_REVIEW would find no revision. Reads the job once and stores a finished
   * draft; true when one was stored. Any failure leaves the honest "not ready" answer.
   */
  private async recordFinishedDraft(publicationId: string, ownerId: string): Promise<boolean> {
    try {
      const publication = await this.publications.findOwnedGeneration(publicationId, ownerId);
      if (!publication?.generationJobId || publication.status !== PublicationStatus.DRAFT) {
        return false;
      }
      const state = await this.generation.getPrivateState(publication.generationJobId, ownerId);
      if (state.status !== 'WAITING_FOR_REVIEW' || !state.draft) return false;
      await this.publications.savePrivateDraft(publicationId, state.draft);
      return true;
    } catch {
      return false;
    }
  }

  async editRevision(
    publicationId: string,
    ownerId: string,
    input: EditPublicationRevisionDto,
  ): Promise<PublicationEditResult> {
    const safety = describePublicationSafety(
      input.markdown,
      input.citations.map(({ url }) => url),
    );
    const revision = await this.publications.createEditedRevision(publicationId, ownerId, input, {
      approved: safety.approved,
      reasons: safety.reasons,
    });
    if (!revision) throw new NotFoundException('Publication not found');
    await this.syncBoard(publicationId);
    this.assertEditCanProceed(revision);
    if (!safety.approved) return this.safetyBlockedEdit(revision, safety.reasons, safety.findings);
    if (revision.revalidationJobId) {
      const state = await this.getRevisionReviewState(publicationId, revision.id, ownerId);
      return { ...state, reviewJobId: revision.revalidationJobId };
    }
    return this.startRevisionReview(publicationId, ownerId, input, revision);
  }

  async getRevisionReviewState(
    publicationId: string,
    revisionId: string,
    ownerId: string,
  ): Promise<PublicationRevisionReviewState> {
    const revision = await this.publications.findOwnedRevisionReview(
      publicationId,
      revisionId,
      ownerId,
    );
    if (!revision) throw new NotFoundException('Publication revision not found');
    if (!revision.revalidationJobId) {
      return {
        revisionId,
        status: revision.safetyApproved ? revision.reviewStatus : 'REVIEW_REQUIRED',
        ready: false,
        reasons: revision.safetyReasons,
      };
    }

    const state = await this.generation.getPrivateState(revision.revalidationJobId, ownerId);
    return this.resolveRevisionReviewState(publicationId, revisionId, ownerId, revision, state);
  }

  private assertEditCanProceed(revision: EditedRevisionRecord): void {
    if (revision.editInProgress) {
      throw new ConflictException('An edit review is already in progress');
    }
    if (!revision.requestMatches) {
      throw new ConflictException('Idempotency key was already used for a different edit');
    }
  }

  private safetyBlockedEdit(
    revision: EditedRevisionRecord,
    reasons: string[],
    findings: PublicationSafetyFinding[],
  ): PublicationEditResult {
    return {
      revisionId: revision.id,
      status: 'REVIEW_REQUIRED',
      reviewJobId: null,
      reasons,
      findings,
    };
  }

  private async startRevisionReview(
    publicationId: string,
    ownerId: string,
    input: EditPublicationRevisionDto,
    revision: EditedRevisionRecord,
  ): Promise<PublicationEditResult> {
    let review: { jobId: string; status: string };
    try {
      review = await this.enqueueReview(ownerId, input, revision);
    } catch (error: unknown) {
      // The review was refused or failed: take the unreviewed revision back out so the last
      // approved one stays current and Publish still works. The coded error reaches the owner.
      await this.publications.discardUnadmittedRevision(publicationId, ownerId, revision.id);
      await this.syncBoard(publicationId);
      throw error;
    }
    const attached = await this.publications.attachRevalidationJob(
      publicationId,
      ownerId,
      revision.id,
      review.jobId,
    );
    if (!attached) throw new ConflictException('Revision review could not be attached');
    return {
      revisionId: revision.id,
      status: review.status,
      reviewJobId: review.jobId,
      reasons: [],
    };
  }

  /**
   * The review is a paid Judge and Critic call, so it draws on the plan's Threads allowance like
   * a start does (spec, "Plans"). A refusal is explained from the plan, never reported as "not in plan".
   */
  private async enqueueReview(
    ownerId: string,
    input: EditPublicationRevisionDto,
    revision: EditedRevisionRecord,
  ): Promise<{ jobId: string; status: string }> {
    try {
      return await this.generation.enqueueRevisionReview(ownerId, {
        parentJobId: revision.generationJobId,
        idempotencyKey: input.idempotencyKey,
        correlationId: input.correlationId,
        spendCapMicroUsd: String(input.capMicroUsd),
        draft: { markdown: input.markdown, citations: input.citations },
      });
    } catch (error: unknown) {
      throw (await this.preflight?.explainBudgetDenial(ownerId, error)) ?? error;
    }
  }

  private resolveRevisionReviewState(
    publicationId: string,
    revisionId: string,
    ownerId: string,
    revision: OwnedRevisionReviewRecord,
    state: PrivateGenerationState,
  ): Promise<PublicationRevisionReviewState> {
    const save: RevisionReviewSaver = (ready, judgeScore, criticScore) =>
      this.saveRevisionReview(
        revisionId,
        publicationId,
        ownerId,
        revision,
        ready,
        judgeScore,
        criticScore,
      );
    return state.status === 'WAITING_FOR_REVIEW'
      ? this.resolveFinishedReview(revisionId, revision, state, save)
      : this.resolveUnfinishedReview(revisionId, state, save);
  }

  /** The review job has not produced a verdict: only a failed or cancelled one is recorded. */
  private async resolveUnfinishedReview(
    revisionId: string,
    state: PrivateGenerationState,
    save: RevisionReviewSaver,
  ): Promise<PublicationRevisionReviewState> {
    if (state.status === 'FAILED' || state.status === 'CANCELLED') {
      await save(false, null, null);
      return { revisionId, status: state.status, ready: false, reasons: ['REVALIDATION_FAILED'] };
    }
    return { revisionId, status: state.status, ready: false, reasons: [] };
  }

  /** The verdict is for other content than the revision now holds, so it cannot make it ready. */
  private async resolveMismatchedReview(
    revisionId: string,
    state: PrivateGenerationState,
    save: RevisionReviewSaver,
  ): Promise<PublicationRevisionReviewState> {
    await save(false, state.draft?.judgeScore ?? null, state.draft?.criticScore ?? null);
    return { revisionId, status: 'STALE', ready: false, reasons: ['CANDIDATE_HASH_MISMATCH'] };
  }

  /** The review job reached a verdict: it counts only for the exact content that was reviewed. */
  private async resolveFinishedReview(
    revisionId: string,
    revision: OwnedRevisionReviewRecord,
    state: PrivateGenerationState,
    save: RevisionReviewSaver,
  ): Promise<PublicationRevisionReviewState> {
    if (!state.review || !state.draft || state.review.draftHash !== revision.contentHash) {
      return this.resolveMismatchedReview(revisionId, state, save);
    }
    const ready = this.revisionReviewPassed(revision, state);
    await save(ready, state.draft.judgeScore, state.draft.criticScore);
    const reasons = [...state.review.reasons];
    if (reasons.length === 0 && !ready) reasons.push('REVIEW_FAILED');
    return {
      revisionId,
      status: ready ? 'READY_FOR_REVIEW' : 'STALE',
      ready,
      reasons,
    };
  }

  private revisionReviewPassed(
    revision: OwnedRevisionReviewRecord,
    state: PrivateGenerationState,
  ): boolean {
    const review = state.review;
    const draft = state.draft;
    return Boolean(
      revision.safetyApproved &&
      review?.ready &&
      draft &&
      draft.judgeScore >= MIN_PUBLICATION_JUDGE_SCORE &&
      draft.criticScore >= MIN_PUBLICATION_CRITIC_SCORE,
    );
  }

  private async saveRevisionReview(
    revisionId: string,
    publicationId: string,
    ownerId: string,
    revision: OwnedRevisionReviewRecord,
    ready: boolean,
    judgeScore: number | null,
    criticScore: number | null,
  ): Promise<void> {
    await this.publications.completeRevisionReview(publicationId, ownerId, revisionId, {
      contentHash: revision.contentHash,
      ready,
      judgeScore,
      criticScore,
    });
  }

  async unpublish(publicationId: string, ownerId: string): Promise<{ unpublished: true }> {
    if (!(await this.publications.unpublishOwned(publicationId, ownerId))) {
      const owned = await this.publications.findOwnedGeneration(publicationId, ownerId);
      if (!owned) throw new NotFoundException('Publication not found');
      // Already unpublished: the same answer as the first call, so a retry or double click is safe.
      if (owned.status !== PublicationStatus.UNPUBLISHED) {
        throw new ConflictException(
          codedErrorBody(
            'Only a published article can be unpublished.',
            ThreadGenerationErrorCode.NOT_PUBLISHED,
            HttpStatus.CONFLICT,
            { publicationStatus: owned.status },
          ),
        );
      }
    }
    await this.removeFromBoard(publicationId);
    return { unpublished: true };
  }

  /** The Board row follows the publication; a failure is logged and the 60 s reconcile heals it. */
  private async syncBoard(publicationId: string): Promise<void> {
    try {
      await this.boardIndex?.syncPublication(publicationId);
    } catch {
      this.logger.warn(`Board index sync failed for ${publicationId}; reconcile will retry`);
    }
  }

  private async removeFromBoard(publicationId: string): Promise<void> {
    try {
      await this.boardIndex?.removePublication(publicationId);
    } catch {
      this.logger.warn(`Board index removal failed for ${publicationId}; reconcile will retry`);
    }
  }

  async export(
    publicationId: string,
    ownerId: string,
    requestedFormat: string | undefined,
  ): Promise<{ format: PublicationExportFormat; content: PublicationExport | string }> {
    if (
      requestedFormat !== PublicationExportFormat.JSON &&
      requestedFormat !== PublicationExportFormat.MARKDOWN &&
      requestedFormat !== PublicationExportFormat.TOON
    ) {
      throw new BadRequestException('Export format must be json, markdown or toon');
    }
    const format = requestedFormat;
    const content = await this.publications.findOwnedExport(publicationId, ownerId);
    if (!content) throw new NotFoundException('Publication not found');
    if (format === PublicationExportFormat.JSON) return { format, content };
    if (format === PublicationExportFormat.TOON) {
      return { format, content: encodeVerifiedToon(content) };
    }
    const citationList = content.citations.map(({ url }) => `- ${url}`).join('\n');
    return {
      format,
      content: `${content.markdown}\n\n## Sources\n\n${citationList}\n`,
    };
  }
}
