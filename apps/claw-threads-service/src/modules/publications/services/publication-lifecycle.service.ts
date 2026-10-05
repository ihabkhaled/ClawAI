import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { PublicationsRepository } from '../repositories/publications.repository';
import { ThreadsGenerationClient } from './threads-generation.client';
import type { StartThreadGenerationDto } from '../dto/start-thread-generation.dto';
import type { PublishedPublication } from '../types/publication.types';

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
}
