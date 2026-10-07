import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';

import { decodeToon } from '../../../../common/utilities/toon.utility';

import { PublicationLifecycleService } from '../publication-lifecycle.service';
import { Locale, ThreadPublicationType } from '@claw/shared-types';
import type { PublicationsRepository } from '../../repositories/publications.repository';

describe('PublicationLifecycleService', () => {
  it('lists only publications owned by the authenticated account', async () => {
    const publications = {
      findOwnedPublications: vi.fn().mockResolvedValue([{ id: 'private-1' }]),
    };
    const service = new PublicationLifecycleService(publications as never, {} as never);

    await expect(service.listOwned('owner-1')).resolves.toEqual([{ id: 'private-1' }]);
    expect(publications.findOwnedPublications).toHaveBeenCalledWith('owner-1');
  });

  const publication = {
    id: 'pub_opaque',
    slug: 'research-note',
    title: 'Research note',
    content: { markdown: '# Research note' },
    publishedAt: new Date('2026-10-05T12:00:00.000Z'),
  };

  it('publishes only a review-ready publication owned by the caller', async () => {
    const repository = {
      publishReadyRevision: vi.fn().mockResolvedValue(publication),
    };
    const service = new PublicationLifecycleService(
      repository as unknown as PublicationsRepository,
      {} as never,
    );

    await expect(service.approveAndPublish('pub_opaque', 'owner-1')).resolves.toEqual(publication);
    expect(repository.publishReadyRevision).toHaveBeenCalledWith('pub_opaque', 'owner-1');
  });

  it('does not publish another owner’s or non-ready publication', async () => {
    const repository = { publishReadyRevision: vi.fn().mockResolvedValue(null) };
    const service = new PublicationLifecycleService(
      repository as unknown as PublicationsRepository,
      {} as never,
    );

    await expect(service.approveAndPublish('pub_opaque', 'owner-2')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('keeps public response fields in the repository allow-list', async () => {
    const repository = {
      publishReadyRevision: vi.fn().mockResolvedValue(publication),
    };
    const service = new PublicationLifecycleService(
      repository as unknown as PublicationsRepository,
      {} as never,
    );

    const result = await service.approveAndPublish('pub_opaque', 'owner-1');

    expect(result).not.toHaveProperty('ownerId');
    expect(result).not.toHaveProperty('sourceSnapshot');
    expect(result).not.toHaveProperty('generationJobId');
  });

  it('queues generation for the authenticated owner and persists a private publication', async () => {
    const publications = {
      createQueuedPublication: vi.fn().mockResolvedValue({ id: 'pub_opaque', slug: 'slug' }),
    };
    const generation = {
      enqueue: vi.fn().mockResolvedValue({ jobId: 'job-private', status: 'QUEUED' }),
    };
    const service = new PublicationLifecycleService(publications as never, generation as never);

    await expect(
      service.enqueueGeneration('owner-1', {
        sourceThreadId: 'thread-1',
        idempotencyKey: 'request-1',
        correlationId: 'correlation-1',
        publicIntentVersion: 'threads-public-v1',
        capMicroUsd: 1000000,
        topic: 'A sufficiently detailed topic for research',
        publicationType: ThreadPublicationType.ARTICLE,
        contentLocale: Locale.FR,
        authors: [
          {
            id: 'author-1',
            provider: 'provider',
            model: 'model',
            maxOutputTokens: 512,
            fallbacks: [],
          },
          {
            id: 'author-2',
            provider: 'provider',
            model: 'model',
            maxOutputTokens: 512,
            fallbacks: [],
          },
          {
            id: 'author-3',
            provider: 'provider',
            model: 'model',
            maxOutputTokens: 512,
            fallbacks: [],
          },
        ],
        judge: {
          id: 'judge',
          provider: 'provider',
          model: 'model',
          maxOutputTokens: 512,
          fallbacks: [],
        },
        critic: {
          id: 'critic',
          provider: 'provider',
          model: 'model',
          maxOutputTokens: 512,
          fallbacks: [],
        },
      }),
    ).resolves.toMatchObject({ publicationId: 'pub_opaque', jobId: 'job-private' });
    expect(generation.enqueue).toHaveBeenCalledWith(
      'owner-1',
      expect.objectContaining({
        sourceThreadId: 'thread-1',
        capMicroUsd: 1000000,
        publicIntentVersion: 'threads-public-v1',
      }),
    );
    expect(publications.createQueuedPublication).toHaveBeenCalledWith(
      'owner-1',
      'job-private',
      expect.objectContaining({ contentLocale: 'fr', publicationType: 'article' }),
    );
  });

  it('persists completed generation output as a private review draft', async () => {
    const draft = {
      markdown: '# Draft title\n\nPrivate content',
      citations: [{ evidenceId: 'evidence-1', url: 'https://example.test/source' }],
      judgeScore: 86,
      criticScore: 79,
    };
    const publications = {
      findOwnedGeneration: vi.fn().mockResolvedValue({
        generationJobId: 'job-private',
        status: 'READY_FOR_REVIEW',
      }),
      savePrivateDraft: vi.fn().mockResolvedValue(undefined),
    };
    const generation = {
      getPrivateState: vi.fn().mockResolvedValue({
        jobId: 'job-private',
        status: 'WAITING_FOR_REVIEW',
        stage: 'READY_FOR_REVIEW',
        round: 2,
        safeErrorCode: null,
        draft,
      }),
    };
    const service = new PublicationLifecycleService(publications as never, generation as never);

    await expect(service.getGenerationState('pub-1', 'owner-1')).resolves.toMatchObject({
      publicationId: 'pub-1',
      publicationStatus: 'READY_FOR_REVIEW',
      status: 'WAITING_FOR_REVIEW',
      draft,
    });
    expect(publications.findOwnedGeneration).toHaveBeenCalledWith('pub-1', 'owner-1');
    expect(publications.savePrivateDraft).toHaveBeenCalledWith('pub-1', draft);
    expect(generation.getPrivateState).toHaveBeenCalledWith('job-private', 'owner-1');
  });

  it('does not query a generation job when the caller does not own its publication', async () => {
    const publications = { findOwnedGeneration: vi.fn().mockResolvedValue(null) };
    const generation = { getPrivateState: vi.fn() };
    const service = new PublicationLifecycleService(publications as never, generation as never);

    await expect(service.getGenerationState('pub-other', 'owner-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(generation.getPrivateState).not.toHaveBeenCalled();
  });

  it('stores an immutable owner edit and starts paid review with its selected cap', async () => {
    const draft = {
      markdown: '# Revised article\n\nUpdated sourced text.',
      citations: [{ evidenceId: 'evidence-1', url: 'https://example.test/source' }],
    };
    const publications = {
      createEditedRevision: vi.fn().mockResolvedValue({
        id: 'revision-2',
        generationJobId: 'generation-1',
        revalidationJobId: null,
        reviewStatus: 'PENDING',
        safetyApproved: true,
        requestMatches: true,
      }),
      attachRevalidationJob: vi.fn().mockResolvedValue(true),
    };
    const generation = {
      enqueueRevisionReview: vi.fn().mockResolvedValue({ jobId: 'review-1', status: 'QUEUED' }),
    };
    const service = new PublicationLifecycleService(publications as never, generation as never);
    const input = {
      ...draft,
      capMicroUsd: 2_000_000,
      idempotencyKey: 'edit-request-1',
      correlationId: 'edit-correlation-1',
    };

    await expect(service.editRevision('pub-1', 'owner-1', input)).resolves.toEqual({
      revisionId: 'revision-2',
      status: 'QUEUED',
      reviewJobId: 'review-1',
      reasons: [],
    });
    expect(publications.createEditedRevision).toHaveBeenCalledWith('pub-1', 'owner-1', input, {
      approved: true,
      reasons: [],
    });
    expect(generation.enqueueRevisionReview).toHaveBeenCalledWith('owner-1', {
      parentJobId: 'generation-1',
      idempotencyKey: 'edit-request-1',
      correlationId: 'edit-correlation-1',
      spendCapMicroUsd: '2000000',
      draft,
    });
    expect(publications.attachRevalidationJob).toHaveBeenCalledWith(
      'pub-1',
      'owner-1',
      'revision-2',
      'review-1',
    );
  });

  it('keeps an unsafe owner edit private without starting paid review', async () => {
    const publications = {
      createEditedRevision: vi.fn().mockResolvedValue({
        id: 'revision-2',
        generationJobId: 'generation-1',
        revalidationJobId: null,
        reviewStatus: 'PENDING',
        safetyApproved: false,
        requestMatches: true,
      }),
    };
    const generation = { enqueueRevisionReview: vi.fn() };
    const service = new PublicationLifecycleService(publications as never, generation as never);

    await expect(
      service.editRevision('pub-1', 'owner-1', {
        markdown: `# Draft\n\napi_key=${'A'.repeat(20)}`,
        citations: [{ evidenceId: 'evidence-1', url: 'https://example.test/source' }],
        capMicroUsd: 2_000_000,
        idempotencyKey: 'unsafe-edit',
        correlationId: 'unsafe-correlation',
      }),
    ).resolves.toMatchObject({ status: 'REVIEW_REQUIRED', reasons: ['POSSIBLE_SECRET'] });
    expect(generation.enqueueRevisionReview).not.toHaveBeenCalled();
  });

  it('marks only the exact reviewed candidate ready for owner approval', async () => {
    const hash = 'a'.repeat(64);
    const publications = {
      findOwnedRevisionReview: vi.fn().mockResolvedValue({
        contentHash: hash,
        reviewStatus: 'PENDING',
        revalidationJobId: 'review-job',
        safetyApproved: true,
        safetyReasons: [],
      }),
      completeRevisionReview: vi.fn().mockResolvedValue(undefined),
    };
    const generation = {
      getPrivateState: vi.fn().mockResolvedValue({
        jobId: 'review-job',
        status: 'WAITING_FOR_REVIEW',
        stage: 'READY_FOR_REVIEW',
        round: 1,
        safeErrorCode: null,
        review: { draftHash: hash, authorConsensus: true, ready: true, reasons: [] },
        draft: {
          markdown: '# Revised article',
          citations: [{ evidenceId: 'evidence-1', url: 'https://example.test/source' }],
          judgeScore: 85,
          criticScore: 78,
        },
      }),
    };
    const service = new PublicationLifecycleService(publications as never, generation as never);

    await expect(service.getRevisionReviewState('pub-1', 'revision-2', 'owner-1')).resolves.toEqual(
      {
        revisionId: 'revision-2',
        status: 'READY_FOR_REVIEW',
        ready: true,
        reasons: [],
      },
    );
    expect(publications.completeRevisionReview).toHaveBeenCalledWith(
      'pub-1',
      'owner-1',
      'revision-2',
      { contentHash: hash, ready: true, judgeScore: 85, criticScore: 78 },
    );
  });

  it('keeps a failed revalidation private and records no provider detail', async () => {
    const publications = {
      findOwnedRevisionReview: vi.fn().mockResolvedValue({
        contentHash: 'b'.repeat(64),
        reviewStatus: 'PENDING',
        revalidationJobId: 'review-job',
        safetyApproved: true,
        safetyReasons: [],
      }),
      completeRevisionReview: vi.fn(),
    };
    const generation = {
      getPrivateState: vi.fn().mockResolvedValue({
        jobId: 'review-job',
        status: 'FAILED',
        stage: 'CRITIC',
        round: 1,
        safeErrorCode: 'GENERATION_FAILED',
        review: null,
        draft: null,
      }),
    };
    const service = new PublicationLifecycleService(publications as never, generation as never);

    await expect(service.getRevisionReviewState('pub-1', 'revision-2', 'owner-1')).resolves.toEqual(
      {
        revisionId: 'revision-2',
        status: 'FAILED',
        ready: false,
        reasons: ['REVALIDATION_FAILED'],
      },
    );
    expect(publications.completeRevisionReview).toHaveBeenCalledWith(
      'pub-1',
      'owner-1',
      'revision-2',
      { contentHash: 'b'.repeat(64), ready: false, judgeScore: null, criticScore: null },
    );
  });

  it('does not query a review job when the caller does not own the revision', async () => {
    const publications = { findOwnedRevisionReview: vi.fn().mockResolvedValue(null) };
    const generation = { getPrivateState: vi.fn() };
    const service = new PublicationLifecycleService(publications as never, generation as never);

    await expect(
      service.getRevisionReviewState('pub-other', 'revision-1', 'owner-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(generation.getPrivateState).not.toHaveBeenCalled();
  });

  it('rejects reuse of an edit idempotency key with changed content', async () => {
    const publications = {
      createEditedRevision: vi.fn().mockResolvedValue({
        id: 'revision-2',
        generationJobId: 'generation-1',
        revalidationJobId: 'review-job',
        reviewStatus: 'PENDING',
        safetyApproved: true,
        safetyReasons: [],
        requestMatches: false,
      }),
    };
    const generation = { enqueueRevisionReview: vi.fn() };
    const service = new PublicationLifecycleService(publications as never, generation as never);

    await expect(
      service.editRevision('pub-1', 'owner-1', {
        markdown: '# Changed article',
        citations: [{ evidenceId: 'evidence-1', url: 'https://example.test/source' }],
        capMicroUsd: 2_000_000,
        idempotencyKey: 'edit-request-1',
        correlationId: 'edit-correlation-1',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(generation.enqueueRevisionReview).not.toHaveBeenCalled();
  });

  describe('export', () => {
    const exported = {
      title: 'Local-first AI',
      markdown: '# Local-first AI\n\nعربي 👩‍💻',
      citations: [{ url: 'https://example.org/source' }],
    };
    const build = (found: unknown = exported) =>
      new PublicationLifecycleService(
        { findOwnedExport: vi.fn().mockResolvedValue(found) } as never,
        {} as never,
      );

    it('returns the canonical JSON untouched', async () => {
      await expect(build().export('pub-1', 'owner-1', 'json')).resolves.toEqual({
        format: 'json',
        content: exported,
      });
    });

    it('returns TOON that decodes back to the canonical JSON', async () => {
      const result = await build().export('pub-1', 'owner-1', 'toon');

      expect(result.format).toBe('toon');
      expect(typeof result.content).toBe('string');
      expect(decodeToon(result.content as string)).toEqual(exported);
    });

    it('rejects an unknown format and a publication the caller does not own', async () => {
      await expect(build().export('pub-1', 'owner-1', 'xml')).rejects.toBeInstanceOf(
        BadRequestException,
      );
      await expect(build(null).export('pub-1', 'owner-2', 'toon')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
