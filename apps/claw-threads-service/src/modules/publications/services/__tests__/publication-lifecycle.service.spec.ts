import { NotFoundException } from '@nestjs/common';

import { PublicationLifecycleService } from '../publication-lifecycle.service';
import type { PublicationsRepository } from '../../repositories/publications.repository';

describe('PublicationLifecycleService', () => {
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
        publicationType: 'article',
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
    expect(publications.createQueuedPublication).toHaveBeenCalledWith('owner-1', 'job-private');
  });

  it('persists completed generation output as a private review draft', async () => {
    const draft = {
      markdown: '# Draft title\n\nPrivate content',
      citations: [{ evidenceId: 'evidence-1', url: 'https://example.test/source' }],
      judgeScore: 86,
      criticScore: 79,
    };
    const publications = {
      findOwnedGeneration: vi.fn().mockResolvedValue({ generationJobId: 'job-private' }),
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
});
