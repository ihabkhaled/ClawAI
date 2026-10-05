import { EventPattern, Locale, ThreadPublicationType } from '@claw/shared-types';
import { createHash } from 'node:crypto';

import { GenerationJobsService } from '../generation-jobs.service';
import { GenerationJobStorageResult } from '../../../../common/enums/generation-job-storage-result.enum';

const role = (id: string) => ({
  id,
  provider: 'OPENAI',
  model: 'gpt-5',
  maxOutputTokens: 1024,
  fallbacks: [],
});

describe('GenerationJobsService', () => {
  it('returns the idempotent owner job without taking another snapshot or budget', async () => {
    const existing = {
      result: GenerationJobStorageResult.SUCCESS,
      job: { id: 'job-existing', status: 'RUNNING', correlationId: 'correlation-old' },
    };
    const repository = {
      findByIdempotencyKey: vi.fn().mockResolvedValue(existing),
    };
    const snapshots = { getOwnedSnapshot: vi.fn() };
    const budgets = { reserve: vi.fn() };
    const service = new GenerationJobsService(
      snapshots as never,
      repository as never,
      {} as never,
      {} as never,
      budgets as never,
    );

    await expect(
      service.enqueue({
        ownerId: 'owner-1',
        sourceThreadId: 'thread-1',
        idempotencyKey: 'request-1',
        correlationId: 'correlation-1',
        spendCapMicroUsd: '5000000',
        topic: 'A detailed topic for a publication',
        publicationType: ThreadPublicationType.ARTICLE,
        contentLocale: Locale.EN,
        publicIntentVersion: 'threads-public-v1',
        authors: [role('author-1'), role('author-2'), role('author-3')],
        judge: role('judge'),
        critic: role('critic'),
      }),
    ).resolves.toEqual({ jobId: 'job-existing', status: 'RUNNING' });
    expect(snapshots.getOwnedSnapshot).not.toHaveBeenCalled();
    expect(budgets.reserve).not.toHaveBeenCalled();
  });

  it('returns the completed draft only to its matching owner', async () => {
    const repository = {
      findOwnerState: vi.fn().mockResolvedValue({
        id: 'job-1',
        status: 'WAITING_FOR_REVIEW',
        stage: 'READY_FOR_REVIEW',
        round: 2,
        safeErrorCode: null,
        revisions: [
          {
            content: {
              markdown: '# Article',
              citations: [{ evidenceId: 'source-1', url: 'https://example.test/source' }],
              judge: { score: 85, findings: ['private review note'] },
              critic: { score: 78, findings: [] },
            },
          },
        ],
      }),
    };
    const service = new GenerationJobsService(
      {} as never,
      repository as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await expect(service.getOwnerState('job-1', 'owner-1')).resolves.toEqual({
      jobId: 'job-1',
      status: 'WAITING_FOR_REVIEW',
      stage: 'READY_FOR_REVIEW',
      round: 2,
      safeErrorCode: null,
      review: null,
      draft: {
        markdown: '# Article',
        citations: [{ evidenceId: 'source-1', url: 'https://example.test/source' }],
        judgeScore: 85,
        criticScore: 78,
      },
    });
    expect(repository.findOwnerState).toHaveBeenCalledWith('job-1', 'owner-1');
  });

  it('validates the owned snapshot and reserves the cap before persisting and dispatching', async () => {
    const order: string[] = [];
    const snapshot = {
      sourceThreadId: 'thread-1',
      sha256: 'a'.repeat(64),
      messages: [{ role: 'USER', content: 'topic' }],
    };
    const snapshots = {
      getOwnedSnapshot: vi.fn().mockImplementation(async () => {
        order.push('snapshot');
        return snapshot;
      }),
    };
    const budgets = {
      reserve: vi.fn().mockImplementation(async () => {
        order.push('reserve');
        return { id: 'budget-1' };
      }),
    };
    const repository = {
      findByIdempotencyKey: vi.fn().mockResolvedValue(null),
      createQueued: vi.fn().mockImplementation(async () => {
        order.push('persist');
        return {
          result: GenerationJobStorageResult.SUCCESS,
          job: { id: 'job-1', status: 'QUEUED', correlationId: 'correlation-1' },
        };
      }),
      leaseDispatch: vi.fn().mockResolvedValue(true),
    };
    const rabbit = {
      publishConfirmed: vi.fn().mockImplementation(async () => order.push('publish')),
    };
    const service = new GenerationJobsService(
      snapshots as never,
      repository as never,
      rabbit as never,
      {} as never,
      budgets as never,
    );

    const result = await service.enqueue({
      ownerId: 'owner-1',
      sourceThreadId: 'thread-1',
      idempotencyKey: 'request-1',
      correlationId: 'correlation-1',
      spendCapMicroUsd: '5000000',
      topic: 'A detailed topic for a publication',
      publicationType: ThreadPublicationType.ARTICLE,
      publicIntentVersion: 'threads-public-v1',
      contentLocale: Locale.EN,
      authors: [role('author-1'), role('author-2'), role('author-3')],
      judge: role('judge'),
      critic: role('critic'),
    });

    expect(result).toEqual({ jobId: 'job-1', status: 'QUEUED' });
    expect(repository.createQueued).toHaveBeenCalledWith(
      expect.objectContaining({ ownerId: 'owner-1' }),
      snapshot,
      snapshot.sha256,
      'budget-1',
    );
    expect(budgets.reserve).toHaveBeenCalledWith('owner-1', 'request-1', 5000000);
    expect(rabbit.publishConfirmed).toHaveBeenCalledWith(
      EventPattern.THREAD_GENERATION_REQUESTED,
      expect.objectContaining({ jobId: 'job-1', correlationId: 'correlation-1' }),
    );
    expect(order).toEqual(['snapshot', 'reserve', 'persist', 'publish']);
  });

  it('does not reserve a budget when snapshot ownership validation fails', async () => {
    const snapshots = {
      getOwnedSnapshot: vi.fn().mockRejectedValue(new Error('source not owned')),
    };
    const budgets = { reserve: vi.fn() };
    const repository = { findByIdempotencyKey: vi.fn().mockResolvedValue(null) };
    const service = new GenerationJobsService(
      snapshots as never,
      repository as never,
      {} as never,
      {} as never,
      budgets as never,
    );

    await expect(
      service.enqueue({
        ownerId: 'owner-1',
        sourceThreadId: 'thread-other-owner',
        idempotencyKey: 'request-2',
        correlationId: 'correlation-2',
        spendCapMicroUsd: '5000000',
        topic: 'A detailed topic for a publication',
        publicationType: ThreadPublicationType.ARTICLE,
        contentLocale: Locale.EN,
        publicIntentVersion: 'threads-public-v1',
        authors: [role('author-1'), role('author-2'), role('author-3')],
        judge: role('judge'),
        critic: role('critic'),
      }),
    ).rejects.toThrow('source not owned');
    expect(budgets.reserve).not.toHaveBeenCalled();
  });

  it('reserves a fresh selected cap before persisting and dispatching an edit review', async () => {
    const order: string[] = [];
    const parent = {
      id: 'parent-job',
      evidenceBundle: { items: [{ id: 'source-1', url: 'https://example.test/source' }] },
      evidenceBundleHash: 'a'.repeat(64),
      request: {
        ownerId: 'owner-1',
        sourceThreadId: 'thread-1',
        idempotencyKey: 'generation-key',
        correlationId: 'generation-correlation',
        spendCapMicroUsd: '5000000',
        topic: 'A detailed topic for a publication',
        publicationType: 'article',
        contentLocale: Locale.EN,
        publicIntentVersion: 'threads-public-v1',
        authors: [role('author-1'), role('author-2'), role('author-3')],
        judge: role('judge'),
        critic: role('critic'),
      },
    };
    const input = {
      ownerId: 'owner-1',
      parentJobId: 'parent-job',
      idempotencyKey: 'edit-key',
      correlationId: 'edit-correlation',
      spendCapMicroUsd: '2500000',
      draft: {
        markdown: '# Edited article',
        citations: [{ evidenceId: 'source-1', url: 'https://example.test/source' }],
      },
    };
    const repository = {
      findRevisionReviewByIdempotencyKey: vi.fn().mockResolvedValue(null),
      findRevisionParent: vi.fn().mockImplementation(async () => {
        order.push('parent');
        return parent;
      }),
      createRevisionReviewQueued: vi.fn().mockImplementation(async () => {
        order.push('persist');
        return {
          result: GenerationJobStorageResult.SUCCESS,
          job: { id: 'review-job', status: 'QUEUED', correlationId: input.correlationId },
        };
      }),
      leaseDispatch: vi.fn().mockResolvedValue(true),
    };
    const budgets = {
      reserve: vi.fn().mockImplementation(async () => {
        order.push('reserve');
        return { id: 'review-budget' };
      }),
    };
    const rabbit = {
      publishConfirmed: vi.fn().mockImplementation(async () => order.push('publish')),
    };
    const service = new GenerationJobsService(
      {} as never,
      repository as never,
      rabbit as never,
      {} as never,
      budgets as never,
    );

    await expect(service.enqueueRevisionReview(input)).resolves.toEqual({
      jobId: 'review-job',
      status: 'QUEUED',
    });
    expect(budgets.reserve).toHaveBeenCalledWith('owner-1', 'edit-key', 2500000);
    expect(repository.createRevisionReviewQueued).toHaveBeenCalledWith(input, 'review-budget');
    expect(order).toEqual(['parent', 'reserve', 'persist', 'publish']);
  });

  it('runs queued edit reviews against the copied evidence without invoking new research', async () => {
    let handler: ((event: unknown) => Promise<void>) | undefined;
    const evidenceBundle = { items: [{ id: 'source-1', url: 'https://example.test/source' }] };
    const evidenceBundleHash = createHash('sha256')
      .update(JSON.stringify(evidenceBundle))
      .digest('hex');
    const reviewRequest = {
      kind: 'revision-review',
      ownerId: 'owner-1',
      parentJobId: 'parent-job',
      idempotencyKey: 'edit-key',
      correlationId: 'edit-correlation',
      spendCapMicroUsd: '2500000',
      draft: {
        markdown: '# Exact edit',
        citations: [{ evidenceId: 'source-1', url: 'https://example.test/source' }],
      },
      topic: 'A detailed topic for a publication',
      publicationType: 'article',
      contentLocale: Locale.EN,
      authors: [role('author-1'), role('author-2'), role('author-3')],
      judge: role('judge'),
      critic: role('critic'),
    };
    const job = {
      id: 'review-job',
      ownerId: 'owner-1',
      budgetId: 'review-budget',
      attemptCount: 1,
      request: reviewRequest,
      sourceSnapshot: { messages: [{ role: 'USER', content: 'source' }] },
      evidenceBundle,
      evidenceBundleHash,
    };
    const repository = {
      claim: vi.fn().mockResolvedValue(job),
      heartbeat: vi.fn().mockResolvedValue(true),
      isCancellationRequested: vi.fn().mockResolvedValue(false),
      saveResult: vi.fn().mockResolvedValue(true),
      completeAttempt: vi.fn(),
      markBudgetClosed: vi.fn(),
    };
    const rabbit = {
      subscribe: vi.fn().mockImplementation(async (_pattern, callback) => {
        handler = callback;
      }),
    };
    const reviewed = { markdown: '# Exact edit', citations: reviewRequest.draft.citations };
    const pipeline = {
      generate: vi.fn(),
      reviewRevision: vi.fn().mockResolvedValue({
        markdown: reviewed.markdown,
        citations: reviewed.citations,
        draftHash: 'b'.repeat(64),
        evidenceBundle,
        evidenceHash: evidenceBundleHash,
        rounds: 1,
        authorDrafts: [],
        judgeReview: { score: 85, blockers: [], findings: [], revisionBrief: '' },
        criticReview: { score: 78, blockers: [], findings: [], revisionBrief: '' },
        authorConsensus: true,
        reviewReady: true,
        reviewReasons: [],
      }),
    };
    const budgets = { close: vi.fn() };
    const service = new GenerationJobsService(
      {} as never,
      repository as never,
      rabbit as never,
      pipeline as never,
      budgets as never,
    );

    await service.subscribe();
    await handler?.({ jobId: 'review-job', correlationId: 'edit-correlation' });

    expect(pipeline.reviewRevision).toHaveBeenCalledOnce();
    expect(pipeline.generate).not.toHaveBeenCalled();
    expect(repository.saveResult).toHaveBeenCalledWith(
      'review-job',
      1,
      expect.objectContaining({
        markdown: reviewed.markdown,
        reviewReady: true,
      }),
    );
    expect(budgets.close).toHaveBeenCalledWith('review-budget', 'FINALIZED');
  });

  it('keeps the parent budget held when a bounded attempt is retried', async () => {
    let handler: ((event: unknown) => Promise<void>) | undefined;
    const job = {
      id: 'job-1',
      ownerId: 'owner-1',
      budgetId: 'budget-1',
      attemptCount: 1,
      request: {
        ownerId: 'owner-1',
        sourceThreadId: 'thread-1',
        idempotencyKey: 'request-1',
        correlationId: 'correlation-1',
        spendCapMicroUsd: '5000000',
        topic: 'A detailed topic for a publication',
        publicationType: 'article',
        contentLocale: Locale.EN,
        publicIntentVersion: 'threads-public-v1',
        authors: [role('author-1'), role('author-2'), role('author-3')],
        judge: role('judge'),
        critic: role('critic'),
      },
      sourceSnapshot: { messages: [] },
    };
    const repository = {
      claim: vi.fn().mockResolvedValue(job),
      isCancellationRequested: vi.fn().mockResolvedValue(false),
      retryOrFail: vi.fn().mockResolvedValue('RETRY'),
    };
    const rabbit = {
      subscribe: vi.fn().mockImplementation(async (_pattern, callback) => {
        handler = callback;
      }),
    };
    const pipeline = {
      generate: vi.fn().mockRejectedValue(new Error('temporary provider outage')),
    };
    const budgets = { close: vi.fn() };
    const service = new GenerationJobsService(
      {} as never,
      repository as never,
      rabbit as never,
      pipeline as never,
      budgets as never,
    );

    await service.subscribe();
    await handler?.({ jobId: 'job-1', correlationId: 'correlation-1' });

    expect(repository.retryOrFail).toHaveBeenCalledWith('job-1', 1);
    expect(budgets.close).not.toHaveBeenCalled();
  });
});
