import { ForbiddenException } from '@nestjs/common';

import { PublicationLifecycleService } from '../publication-lifecycle.service';
import { GenerationStartGate } from '../generation-start-gate.service';

type FakeRevision = { id: string; status: 'READY' | 'PENDING' | 'STALE' };

/** A small stateful stand-in for the revision table: just what the edit flow touches. */
function fakeRepository() {
  const revisions: FakeRevision[] = [{ id: 'r1', status: 'READY' }];
  return {
    revisions,
    createEditedRevision: vi.fn(() => {
      revisions.push({ id: 'r2', status: 'PENDING' });
      return Promise.resolve({
        id: 'r2',
        generationJobId: 'j1',
        revalidationJobId: null,
        editInProgress: false,
        requestMatches: true,
        safetyApproved: true,
        safetyReasons: [],
        reviewStatus: 'PENDING',
        revision: 2,
      });
    }),
    discardUnadmittedRevision: vi.fn((_publicationId: string, _ownerId: string, id: string) => {
      revisions.splice(
        revisions.findIndex((revision) => revision.id === id),
        1,
      );
      return Promise.resolve(true);
    }),
    attachRevalidationJob: vi.fn().mockResolvedValue(true),
    findOwnedRevisionReview: vi.fn().mockResolvedValue({
      contentHash: 'h2',
      reviewStatus: 'PENDING',
      safetyApproved: true,
      safetyReasons: [],
      revalidationJobId: 'rj',
    }),
    completeRevisionReview: vi.fn(
      (_publicationId: string, _ownerId: string, id: string, result: { ready: boolean }) => {
        for (const revision of revisions) {
          if (revision.id === id) revision.status = result.ready ? 'READY' : 'STALE';
          else if (result.ready && revision.status === 'READY') revision.status = 'STALE';
        }
        return Promise.resolve();
      },
    ),
    hasPublishableRevision: vi.fn(() =>
      Promise.resolve(revisions.some((revision) => revision.status === 'READY')),
    ),
    savePrivateDraft: vi.fn().mockResolvedValue(undefined),
    findOwnedGeneration: vi
      .fn()
      .mockResolvedValue({ id: 'p1', generationJobId: 'j1', status: 'READY_FOR_REVIEW' }),
  };
}

const edit = {
  markdown: '# edited',
  citations: [],
  idempotencyKey: 'k',
  correlationId: 'c',
  capMicroUsd: 100_000,
} as never;

const jobState = {
  jobId: 'j1',
  status: 'COMPLETED',
  stage: 'DONE',
  round: 1,
  safeErrorCode: null,
  draft: null,
};

function build(repository: object, generation: object, preflight?: object) {
  return new PublicationLifecycleService(
    repository as never,
    generation as never,
    { notifyPublished: vi.fn() } as never,
    new GenerationStartGate(),
    undefined,
    preflight as never,
  );
}

function reviewedGeneration(criticScore: number, ready: boolean, reasons: string[]) {
  return {
    enqueueRevisionReview: vi.fn().mockResolvedValue({ jobId: 'rj', status: 'QUEUED' }),
    getPrivateState: vi.fn().mockResolvedValue({
      ...jobState,
      status: 'WAITING_FOR_REVIEW',
      draft: { markdown: '# edited', citations: [], judgeScore: 90, criticScore },
      review: { draftHash: 'h2', ready, authorConsensus: true, reasons },
    }),
  };
}

describe('edit state machine keeps the approved revision publishable', () => {
  it('a refused review removes the new revision and publish stays possible', async () => {
    const repository = fakeRepository();
    const refusal = new ForbiddenException({ code: 'THREAD_GENERATION_ALLOWANCE_UNAVAILABLE' });
    const generation = {
      enqueueRevisionReview: vi.fn().mockRejectedValue(new ForbiddenException('x')),
      getPrivateState: vi.fn().mockResolvedValue(jobState),
    };
    const service = build(repository, generation, {
      explainBudgetDenial: vi.fn().mockResolvedValue(refusal),
    });

    await expect(service.editRevision('p1', 'o1', edit)).rejects.toBe(refusal);

    expect(repository.revisions).toEqual([{ id: 'r1', status: 'READY' }]);
    await expect(service.getGenerationState('p1', 'o1')).resolves.toMatchObject({
      canPublish: true,
    });
  });

  it('an unexpected review error also restores the previous revision', async () => {
    const repository = fakeRepository();
    const generation = { enqueueRevisionReview: vi.fn().mockRejectedValue(new Error('down')) };

    await expect(build(repository, generation).editRevision('p1', 'o1', edit)).rejects.toThrow(
      'down',
    );

    expect(repository.revisions.map((revision) => revision.id)).toEqual(['r1']);
  });

  it('a Critic failure marks only the new revision stale; the old one stays publishable', async () => {
    const repository = fakeRepository();
    const service = build(repository, reviewedGeneration(3, false, ['CRITIC_THRESHOLD_FAILED']));

    const started = await service.editRevision('p1', 'o1', edit);
    const verdict = await service.getRevisionReviewState('p1', started.revisionId, 'o1');

    expect(verdict).toMatchObject({ ready: false, reasons: ['CRITIC_THRESHOLD_FAILED'] });
    expect(repository.revisions.map((revision) => revision.status)).toEqual(['READY', 'STALE']);
    await expect(service.getGenerationState('p1', 'o1')).resolves.toMatchObject({
      canPublish: true,
    });
  });

  it('a passing edit replaces the old revision', async () => {
    const repository = fakeRepository();
    const service = build(repository, reviewedGeneration(90, true, []));

    const started = await service.editRevision('p1', 'o1', edit);
    await service.getRevisionReviewState('p1', started.revisionId, 'o1');

    expect(repository.revisions.map((revision) => revision.status)).toEqual(['STALE', 'READY']);
    await expect(service.getGenerationState('p1', 'o1')).resolves.toMatchObject({
      canPublish: true,
    });
  });

  it('canPublish is false when no approved revision exists in a publishable status', async () => {
    const repository = fakeRepository();
    repository.revisions.length = 0;
    const generation = { getPrivateState: vi.fn().mockResolvedValue(jobState) };

    await expect(
      build(repository, generation).getGenerationState('p1', 'o1'),
    ).resolves.toMatchObject({ canPublish: false, canRepublish: false });
  });
});
