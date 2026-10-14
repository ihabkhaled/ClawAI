import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';

import { PublicationLifecycleService } from '../publication-lifecycle.service';
import { GenerationStartGate } from '../generation-start-gate.service';

const published = {
  kind: 'PUBLISHED' as const,
  publication: {
    id: 'p1',
    slug: 's',
    title: 't',
    content: { markdown: '# t' },
    publishedAt: new Date('2026-10-14T10:00:00.000Z'),
  },
  newlyPublished: false,
};
const draft = { markdown: '# t', citations: [], judgeScore: 9, criticScore: 9 };

function build(
  repository: object,
  generation: object = {},
  preflight?: object,
): PublicationLifecycleService {
  return new PublicationLifecycleService(
    repository as never,
    generation as never,
    { notifyPublished: vi.fn() } as never,
    new GenerationStartGate(),
    undefined,
    preflight as never,
  );
}

describe('publish right after progress says WAITING_FOR_REVIEW (N-03)', () => {
  it('saves the finished draft, then publishes instead of answering 409', async () => {
    const repository = {
      publishReadyRevision: vi
        .fn()
        .mockResolvedValueOnce({ kind: 'NOT_READY' })
        .mockResolvedValueOnce(published),
      findOwnedGeneration: vi
        .fn()
        .mockResolvedValue({ id: 'p1', generationJobId: 'j1', status: 'DRAFT' }),
      savePrivateDraft: vi.fn().mockResolvedValue(undefined),
    };
    const generation = {
      getPrivateState: vi.fn().mockResolvedValue({ status: 'WAITING_FOR_REVIEW', draft }),
    };

    await expect(build(repository, generation).approveAndPublish('p1', 'o1')).resolves.toBe(
      published.publication,
    );
    expect(repository.savePrivateDraft).toHaveBeenCalledWith('p1', draft);
  });

  it('keeps the honest 409 when the job has not finished', async () => {
    const repository = {
      publishReadyRevision: vi.fn().mockResolvedValue({ kind: 'NOT_READY' }),
      findOwnedGeneration: vi
        .fn()
        .mockResolvedValue({ id: 'p1', generationJobId: 'j1', status: 'DRAFT' }),
      savePrivateDraft: vi.fn(),
    };
    const generation = {
      getPrivateState: vi.fn().mockResolvedValue({ status: 'RUNNING', draft: null }),
    };

    await expect(
      build(repository, generation).approveAndPublish('p1', 'o1'),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(repository.savePrivateDraft).not.toHaveBeenCalled();
    expect(repository.publishReadyRevision).toHaveBeenCalledTimes(1);
  });
});

describe('unpublish is idempotent (N-04)', () => {
  it('answers 200 again for an article that is already unpublished', async () => {
    const repository = {
      unpublishOwned: vi.fn().mockResolvedValue(false),
      findOwnedGeneration: vi.fn().mockResolvedValue({ id: 'p1', status: 'UNPUBLISHED' }),
    };

    await expect(build(repository).unpublish('p1', 'o1')).resolves.toEqual({ unpublished: true });
  });

  it('says what state a never-published draft is in, with a code', async () => {
    const repository = {
      unpublishOwned: vi.fn().mockResolvedValue(false),
      findOwnedGeneration: vi.fn().mockResolvedValue({ id: 'p1', status: 'DRAFT' }),
    };

    await expect(build(repository).unpublish('p1', 'o1')).rejects.toMatchObject({
      response: { code: 'THREAD_PUBLICATION_NOT_PUBLISHED' },
    });
  });

  it('still answers 404 for a publication the caller does not own', async () => {
    const repository = {
      unpublishOwned: vi.fn().mockResolvedValue(false),
      findOwnedGeneration: vi.fn().mockResolvedValue(null),
    };

    await expect(build(repository).unpublish('p1', 'o2')).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('owner state tells the page what it may do (D-L2-05)', () => {
  const stateFor = (status: string) => {
    const repository = {
      findOwnedGeneration: vi.fn().mockResolvedValue({ id: 'p1', generationJobId: 'j1', status }),
      hasPublishableRevision: vi.fn().mockResolvedValue(true),
    };
    const generation = {
      getPrivateState: vi.fn().mockResolvedValue({
        jobId: 'j1',
        status: 'COMPLETED',
        stage: 'DONE',
        round: 1,
        safeErrorCode: null,
        draft: null,
      }),
    };
    return build(repository, generation).getGenerationState('p1', 'o1');
  };

  it.each([
    ['READY_FOR_REVIEW', true, false],
    ['UNPUBLISHED', true, true],
    ['DRAFT', false, false],
    ['PUBLISHED', false, false],
    ['REVOKED', false, false],
  ])('%s gives canPublish %s and canRepublish %s', async (status, canPublish, canRepublish) => {
    await expect(stateFor(status)).resolves.toMatchObject({ canPublish, canRepublish });
  });
});

describe('owner edit refusal is truthful (D-L2-07)', () => {
  it('explains a refused review from the plan instead of "not in plan"', async () => {
    const explained = new ForbiddenException({ code: 'THREAD_GENERATION_ALLOWANCE_UNAVAILABLE' });
    const preflight = { explainBudgetDenial: vi.fn().mockResolvedValue(explained) };
    const generation = {
      enqueueRevisionReview: vi.fn().mockRejectedValue(new ForbiddenException('x')),
    };
    const repository = {
      createEditedRevision: vi.fn().mockResolvedValue({
        id: 'r1',
        generationJobId: 'j1',
        revalidationJobId: null,
        editInProgress: false,
        requestMatches: true,
      }),
      discardUnadmittedRevision: vi.fn().mockResolvedValue(true),
    };

    await expect(
      build(repository, generation, preflight).editRevision('p1', 'o1', {
        markdown: '# edited',
        citations: [],
        idempotencyKey: 'k',
        correlationId: 'c',
        capMicroUsd: 100_000,
      } as never),
    ).rejects.toBe(explained);
  });
});
