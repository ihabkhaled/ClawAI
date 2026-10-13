import { ConflictException, NotFoundException } from '@nestjs/common';

import type { StartThreadGenerationDto } from '../../dto/start-thread-generation.dto';
import { GenerationStartGate } from '../generation-start-gate.service';
import { PublicationLifecycleService } from '../publication-lifecycle.service';

const role = (id: string) => ({
  id,
  provider: 'GEMINI',
  model: 'gemini-2.5-flash',
  maxOutputTokens: 512,
  fallbacks: [],
});

const input = {
  capMicroUsd: 2_000_000,
  sourceThreadId: 'thread-1',
  idempotencyKey: 'scoped-key',
  correlationId: 'correlation-1',
  publicIntentVersion: 'threads-public-v1',
  contentLocale: 'en',
  topic: 'A detailed research subject',
  publicationType: 'article',
  authors: [role('author-1'), role('author-2'), role('author-3')],
  judge: role('judge'),
  critic: role('critic'),
} as StartThreadGenerationDto;

function setup() {
  const publications = {
    createQueuedPublication: vi.fn().mockResolvedValue({ id: 'pub-1', slug: 'slug' }),
    findByGenerationJobId: vi.fn().mockResolvedValue(null),
    findOwnedGeneration: vi.fn(),
    publishReadyRevision: vi.fn(),
  };
  const generation = {
    enqueue: vi.fn().mockResolvedValue({ jobId: 'job-1', status: 'QUEUED' }),
    cancel: vi.fn().mockResolvedValue(undefined),
    getPrivateState: vi.fn(),
  };
  const notifications = { notifyPublished: vi.fn().mockResolvedValue(undefined) };
  const gate = new GenerationStartGate();
  const service = new PublicationLifecycleService(
    publications as never,
    generation as never,
    notifications as never,
    gate,
  );
  return { service, publications, generation, notifications, gate };
}

describe('PublicationLifecycleService.enqueueGeneration is atomic (ADR-176)', () => {
  it('saves the publication with the start identity and cancels nothing on success', async () => {
    const { service, publications, generation } = setup();
    const identity = { keyHash: 'k', requestHash: 'r' };

    await expect(service.enqueueGeneration('owner-1', input, identity)).resolves.toEqual({
      publicationId: 'pub-1',
      jobId: 'job-1',
      status: 'QUEUED',
    });

    expect(publications.createQueuedPublication).toHaveBeenCalledWith(
      'owner-1',
      'job-1',
      input,
      identity,
    );
    expect(generation.cancel).not.toHaveBeenCalled();
  });

  it('cancels the new job when the publication cannot be saved', async () => {
    const { service, publications, generation } = setup();
    publications.createQueuedPublication.mockRejectedValue(new Error('db down'));

    await expect(service.enqueueGeneration('owner-1', input)).rejects.toThrow('db down');

    expect(generation.cancel).toHaveBeenCalledExactlyOnceWith('job-1');
  });

  it('cancels the new job when the account was deleted meanwhile', async () => {
    const { service, publications, generation } = setup();
    publications.createQueuedPublication.mockResolvedValue(null);

    await expect(service.enqueueGeneration('owner-1', input)).rejects.toBeInstanceOf(
      ConflictException,
    );

    expect(generation.cancel).toHaveBeenCalledExactlyOnceWith('job-1');
  });

  it('does not cancel a job that another request already attached to a publication', async () => {
    const { service, publications, generation } = setup();
    publications.createQueuedPublication.mockRejectedValue(new Error('collided'));
    publications.findByGenerationJobId.mockResolvedValue({ id: 'pub-other' });

    await expect(service.enqueueGeneration('owner-1', input)).rejects.toThrow('collided');

    expect(generation.cancel).not.toHaveBeenCalled();
  });

  it('still reports the original failure when the cancel itself fails', async () => {
    const { service, publications, generation } = setup();
    publications.createQueuedPublication.mockRejectedValue(new Error('db down'));
    generation.cancel.mockRejectedValue(new Error('generation down'));

    await expect(service.enqueueGeneration('owner-1', input)).rejects.toThrow('db down');
  });

  it('creates no publication and cancels nothing when the enqueue itself fails', async () => {
    const { service, publications, generation } = setup();
    generation.enqueue.mockRejectedValue(new Error('refused'));

    await expect(service.enqueueGeneration('owner-1', input)).rejects.toThrow('refused');

    expect(publications.createQueuedPublication).not.toHaveBeenCalled();
    expect(generation.cancel).not.toHaveBeenCalled();
  });

  it('marks the job as being attached only while the publication is being saved', async () => {
    const { service, publications, gate } = setup();
    let duringSave = false;
    publications.createQueuedPublication.mockImplementation(async () => {
      duringSave = gate.isAttaching('job-1');
      return { id: 'pub-1', slug: 'slug' };
    });

    await service.enqueueGeneration('owner-1', input);

    expect(duringSave).toBe(true);
    expect(gate.isAttaching('job-1')).toBe(false);
  });

  it('clears the attaching mark when the save fails', async () => {
    const { service, publications, gate } = setup();
    publications.createQueuedPublication.mockRejectedValue(new Error('db down'));

    await expect(service.enqueueGeneration('owner-1', input)).rejects.toThrow();

    expect(gate.isAttaching('job-1')).toBe(false);
  });
});

describe('PublicationLifecycleService.cancelGeneration tells the truth (D-11)', () => {
  const owned = (status: string) => ({
    id: 'pub-1',
    ownerId: 'owner-1',
    generationJobId: 'job-1',
    status,
  });

  it.each(['QUEUED', 'RUNNING'])('cancels a %s generation', async (jobStatus) => {
    const { service, publications, generation } = setup();
    publications.findOwnedGeneration.mockResolvedValue(owned('DRAFT'));
    generation.getPrivateState.mockResolvedValue({ status: jobStatus });

    await expect(service.cancelGeneration('pub-1', 'owner-1')).resolves.toEqual({
      publicationId: 'pub-1',
      status: 'CANCEL_REQUESTED',
    });
    expect(generation.cancel).toHaveBeenCalledWith('job-1');
  });

  it.each(['CANCELLED', 'FAILED', 'WAITING_FOR_REVIEW', 'COMPLETED'])(
    'answers 409 with the real state for a %s generation and cancels nothing',
    async (jobStatus) => {
      const { service, publications, generation } = setup();
      publications.findOwnedGeneration.mockResolvedValue(owned('DRAFT'));
      generation.getPrivateState.mockResolvedValue({ status: jobStatus });

      const outcome = service.cancelGeneration('pub-1', 'owner-1');

      await expect(outcome).rejects.toBeInstanceOf(ConflictException);
      await expect(outcome).rejects.toMatchObject({
        response: {
          code: 'THREAD_GENERATION_NOT_CANCELLABLE',
          statusCode: 409,
          state: jobStatus,
          publicationStatus: 'DRAFT',
        },
      });
      expect(generation.cancel).not.toHaveBeenCalled();
    },
  );

  it('answers 409 for a published article even if its old job looks active', async () => {
    const { service, publications, generation } = setup();
    publications.findOwnedGeneration.mockResolvedValue(owned('PUBLISHED'));
    generation.getPrivateState.mockResolvedValue({ status: 'RUNNING' });

    await expect(service.cancelGeneration('pub-1', 'owner-1')).rejects.toMatchObject({
      response: { publicationStatus: 'PUBLISHED' },
    });
    expect(generation.cancel).not.toHaveBeenCalled();
  });

  it('answers 404 to a non-owner without touching the generation service', async () => {
    const { service, publications, generation } = setup();
    publications.findOwnedGeneration.mockResolvedValue(null);

    await expect(service.cancelGeneration('pub-1', 'intruder')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(generation.getPrivateState).not.toHaveBeenCalled();
  });
});

describe('PublicationLifecycleService.approveAndPublish outcomes (D7, D8)', () => {
  const article = {
    id: 'pub-1',
    slug: 'slug',
    title: 'Title',
    content: { markdown: '# Title' },
    publishedAt: new Date('2026-10-13T10:00:00.000Z'),
  };

  it('notifies once for a new publish', async () => {
    const { service, publications, notifications } = setup();
    publications.publishReadyRevision.mockResolvedValue({
      kind: 'PUBLISHED',
      publication: article,
      newlyPublished: true,
    });

    await expect(service.approveAndPublish('pub-1', 'owner-1')).resolves.toBe(article);
    expect(notifications.notifyPublished).toHaveBeenCalledTimes(1);
  });

  it('answers a repeated publish of a live article with it again and notifies nobody', async () => {
    const { service, publications, notifications } = setup();
    publications.publishReadyRevision.mockResolvedValue({
      kind: 'PUBLISHED',
      publication: article,
      newlyPublished: false,
    });

    await expect(service.approveAndPublish('pub-1', 'owner-1')).resolves.toBe(article);
    expect(notifications.notifyPublished).not.toHaveBeenCalled();
  });

  it('answers 409 with the reason when nothing is ready to publish', async () => {
    const { service, publications } = setup();
    publications.publishReadyRevision.mockResolvedValue({ kind: 'NOT_READY' });

    await expect(service.approveAndPublish('pub-1', 'owner-1')).rejects.toThrow(
      /no approved revision ready to publish/u,
    );
  });

  it('answers 409 for a publication removed by moderation', async () => {
    const { service, publications } = setup();
    publications.publishReadyRevision.mockResolvedValue({ kind: 'REVOKED' });

    await expect(service.approveAndPublish('pub-1', 'owner-1')).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('keeps 404 for a publication the caller does not own', async () => {
    const { service, publications } = setup();
    publications.publishReadyRevision.mockResolvedValue(null);

    await expect(service.approveAndPublish('pub-1', 'intruder')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
