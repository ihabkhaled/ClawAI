import { ConflictException } from '@nestjs/common';

import { PublicationGenerationState, PublicationStatus } from '../../../../generated/prisma';
import { PUBLISHABLE_REVISION_WHERE } from '../../constants/publication-publish.constants';
import { PublicationsRepository } from '../../repositories/publications.repository';
import { canOwnerDelete, canOwnerPublish } from '../../utilities/owner-page-status.utility';
import { GenerationStartGate } from '../generation-start-gate.service';
import { PublicationGenerationOwnerService } from '../publication-generation-owner.service';

/**
 * The list's canPublish and canDelete are not a second copy of the rules: these tests run the real
 * publish write and the real delete service on every state and require the same answer.
 */
describe('owner list parity with the real publish and delete rules (ADR-205)', () => {
  const jobToStored: Record<string, PublicationGenerationState> = {
    QUEUED: PublicationGenerationState.GENERATING,
    RUNNING: PublicationGenerationState.GENERATING,
    WAITING_FOR_REVIEW: PublicationGenerationState.DONE,
    COMPLETED: PublicationGenerationState.DONE,
    FAILED: PublicationGenerationState.FAILED,
    CANCELLED: PublicationGenerationState.CANCELLED,
  };

  async function realDelete(status: PublicationStatus, jobStatus: string): Promise<boolean> {
    const publications = {
      findOwnedGeneration: vi.fn().mockResolvedValue({ id: 'p', generationJobId: 'j', status }),
      deleteOwnedUnpublished: vi.fn().mockResolvedValue(true),
    };
    const generation = {
      getPrivateState: vi.fn().mockResolvedValue({ status: jobStatus }),
      deleteJob: vi.fn().mockResolvedValue(undefined),
    };
    const service = new PublicationGenerationOwnerService(
      publications as never,
      generation as never,
      {} as never,
      {} as never,
      new GenerationStartGate(),
    );
    try {
      await service.delete('p', 'o');
      return true;
    } catch (error) {
      if (error instanceof ConflictException) return false;
      throw error;
    }
  }

  it.each(
    Object.values(PublicationStatus).flatMap((status) =>
      Object.keys(jobToStored).map((job) => [status, job] as const),
    ),
  )('canDelete for %s with job %s equals the real delete answer', async (status, job) => {
    // A non-DRAFT publication never has a running job; the list ignores the job there.
    if (status !== PublicationStatus.DRAFT && (job === 'QUEUED' || job === 'RUNNING')) return;
    const listAnswer = canOwnerDelete({
      status,
      generationState: jobToStored[job] ?? null,
      generationFailureCode: null,
      generationFailureStep: null,
      generationFailureRetryable: null,
    });
    expect(listAnswer).toBe(await realDelete(status, job));
  });

  function publishRepository(status: PublicationStatus, hasRevision: boolean) {
    const findFirst = vi.fn().mockResolvedValue({
      id: 'p',
      slug: 's',
      status,
      publishedAt: null,
      revisions: hasRevision
        ? [{ id: 'r', title: 'T', content: { markdown: 'body' }, reviewStatus: 'READY_FOR_REVIEW' }]
        : [],
    });
    const transaction = {
      threadPublication: {
        findFirst,
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      threadPublicationRevision: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    };
    const prisma = {
      $transaction: vi.fn((callback: (tx: unknown) => unknown) => callback(transaction)),
    };
    return { repository: new PublicationsRepository(prisma as never), findFirst };
  }

  it.each(
    Object.values(PublicationStatus)
      .filter((status) => status !== PublicationStatus.PUBLISHED)
      .flatMap(
        (status) =>
          [
            [status, true],
            [status, false],
          ] as const,
      ),
  )('canPublish for %s with revision=%s equals the real publish answer', async (status, has) => {
    const { repository, findFirst } = publishRepository(status, has);
    const outcome = await repository.publishReadyRevision('p', 'o');
    expect(canOwnerPublish(status, has)).toBe(outcome?.kind === 'PUBLISHED');
    expect(findFirst.mock.calls[0]?.[0].select.revisions.where).toBe(PUBLISHABLE_REVISION_WHERE);
  });

  it('an already published article is not offered Publish again', () => {
    expect(canOwnerPublish(PublicationStatus.PUBLISHED, true)).toBe(false);
  });
});
