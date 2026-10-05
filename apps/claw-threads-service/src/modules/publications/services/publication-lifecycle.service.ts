import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PublicationsRepository } from '../repositories/publications.repository';
import { ThreadsGenerationClient } from './threads-generation.client';
import type { EditPublicationRevisionDto } from '../dto/edit-publication-revision.dto';
import type { StartThreadGenerationDto } from '../dto/start-thread-generation.dto';
import { PublicationExportFormat } from '../../../common/enums/publication-export-format.enum';
import type {
  EditedRevisionRecord,
  OwnedRevisionReviewRecord,
  PublicationEditResult,
  PublicationExport,
  PublicationRevisionReviewState,
  PublicPublication,
  PublishedPublication,
} from '../types/publication.types';
import type { PrivateGenerationState } from '../types/generation.types';
import { evaluatePublicationSafety } from '../utilities/publication-safety.utility';
import {
  MIN_PUBLICATION_CRITIC_SCORE,
  MIN_PUBLICATION_JUDGE_SCORE,
} from '../constants/publication-review.constants';

@Injectable()
export class PublicationLifecycleService {
  constructor(
    private readonly publications: PublicationsRepository,
    private readonly generation: ThreadsGenerationClient,
  ) {}

  async enqueueGeneration(
    ownerId: string,
    input: StartThreadGenerationDto,
  ): Promise<{ publicationId: string; jobId: string; status: string }> {
    const job = await this.generation.enqueue(ownerId, input);
    const publication = await this.publications.createQueuedPublication(ownerId, job.jobId);
    if (!publication) throw new ConflictException('Generation job owner mismatch');
    return { publicationId: publication.id, jobId: job.jobId, status: job.status };
  }

  async getGenerationState(
    publicationId: string,
    ownerId: string,
  ): Promise<{
    publicationId: string;
    jobId: string;
    status: string;
    stage: string;
    round: number;
    safeErrorCode: string | null;
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
    if (state.status === 'WAITING_FOR_REVIEW' && state.draft) {
      await this.publications.savePrivateDraft(publicationId, state.draft);
    }
    return { publicationId, ...state };
  }

  async cancelGeneration(
    publicationId: string,
    ownerId: string,
  ): Promise<{ publicationId: string; status: 'CANCEL_REQUESTED' }> {
    const publication = await this.publications.findOwnedGeneration(publicationId, ownerId);
    if (!publication?.generationJobId) throw new NotFoundException('Publication not found');
    await this.generation.cancel(publication.generationJobId);
    return { publicationId, status: 'CANCEL_REQUESTED' };
  }

  async approveAndPublish(publicationId: string, ownerId: string): Promise<PublishedPublication> {
    const publication = await this.publications.publishReadyRevision(publicationId, ownerId);
    if (!publication) throw new NotFoundException('Publication not found');
    return publication;
  }

  async editRevision(
    publicationId: string,
    ownerId: string,
    input: EditPublicationRevisionDto,
  ): Promise<PublicationEditResult> {
    const safety = evaluatePublicationSafety(
      [input.markdown, ...input.citations.map(({ url }) => url)].join('\n'),
    );
    const revision = await this.publications.createEditedRevision(
      publicationId,
      ownerId,
      input,
      safety,
    );
    if (!revision) throw new NotFoundException('Publication not found');
    this.assertEditCanProceed(revision);
    if (!safety.approved) return this.safetyBlockedEdit(revision, safety.reasons);
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
  ): PublicationEditResult {
    return {
      revisionId: revision.id,
      status: 'REVIEW_REQUIRED',
      reviewJobId: null,
      reasons,
    };
  }

  private async startRevisionReview(
    publicationId: string,
    ownerId: string,
    input: EditPublicationRevisionDto,
    revision: EditedRevisionRecord,
  ): Promise<PublicationEditResult> {
    const review = await this.generation.enqueueRevisionReview(ownerId, {
      parentJobId: revision.generationJobId,
      idempotencyKey: input.idempotencyKey,
      correlationId: input.correlationId,
      spendCapMicroUsd: String(input.capMicroUsd),
      draft: { markdown: input.markdown, citations: input.citations },
    });
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

  private async resolveRevisionReviewState(
    publicationId: string,
    revisionId: string,
    ownerId: string,
    revision: OwnedRevisionReviewRecord,
    state: PrivateGenerationState,
  ): Promise<PublicationRevisionReviewState> {
    if (state.status !== 'WAITING_FOR_REVIEW') {
      if (state.status === 'FAILED' || state.status === 'CANCELLED') {
        await this.saveRevisionReview(
          revisionId,
          publicationId,
          ownerId,
          revision,
          false,
          null,
          null,
        );
        return { revisionId, status: state.status, ready: false, reasons: ['REVALIDATION_FAILED'] };
      }
      return { revisionId, status: state.status, ready: false, reasons: [] };
    }
    if (!state.review || !state.draft || state.review.draftHash !== revision.contentHash) {
      await this.saveRevisionReview(
        revisionId,
        publicationId,
        ownerId,
        revision,
        false,
        state.draft?.judgeScore ?? null,
        state.draft?.criticScore ?? null,
      );
      return {
        revisionId,
        status: 'STALE',
        ready: false,
        reasons: ['CANDIDATE_HASH_MISMATCH'],
      };
    }
    const ready = this.revisionReviewPassed(revision, state);
    await this.saveRevisionReview(
      revisionId,
      publicationId,
      ownerId,
      revision,
      ready,
      state.draft.judgeScore,
      state.draft.criticScore,
    );
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
      review.authorConsensus &&
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

  async getPublicPublication(slug: string): Promise<PublicPublication> {
    const publication = await this.publications.findPublic(slug);
    if (!publication) throw new NotFoundException('Publication not found');
    return publication;
  }

  async unpublish(publicationId: string, ownerId: string): Promise<{ unpublished: true }> {
    if (!(await this.publications.unpublishOwned(publicationId, ownerId))) {
      throw new NotFoundException('Publication not found');
    }
    return { unpublished: true };
  }

  async export(
    publicationId: string,
    ownerId: string,
    requestedFormat: string | undefined,
  ): Promise<{ format: PublicationExportFormat; content: PublicationExport | string }> {
    if (
      requestedFormat !== PublicationExportFormat.JSON &&
      requestedFormat !== PublicationExportFormat.MARKDOWN
    ) {
      throw new BadRequestException('Export format must be json or markdown');
    }
    const format = requestedFormat;
    const content = await this.publications.findOwnedExport(publicationId, ownerId);
    if (!content) throw new NotFoundException('Publication not found');
    if (format === PublicationExportFormat.JSON) return { format, content };
    const citationList = content.citations.map(({ url }) => `- ${url}`).join('\n');
    return {
      format,
      content: `${content.markdown}\n\n## Sources\n\n${citationList}\n`,
    };
  }
}
