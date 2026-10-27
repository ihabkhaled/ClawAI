import { Locale, ThreadArticleLength, ThreadPublicationType } from '@claw/shared-types';

import { GenerationJobStorageResult } from '../../../../common/enums/generation-job-storage-result.enum';
import { GenerationJobsService } from '../generation-jobs.service';

const role = (id: string) => ({
  id,
  provider: 'OPENROUTER',
  model: 'm',
  maxOutputTokens: 1024,
  fallbacks: [],
});

const original = {
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
};

function build(inherit: () => Promise<number> = () => Promise.resolve(2)) {
  const created: Array<Record<string, unknown>> = [];
  const repository = {
    findRetrySource: vi.fn().mockResolvedValue({
      id: 'job-old',
      status: 'FAILED',
      request: original,
      sourceSnapshot: { messages: [] },
      sourceSnapshotHash: 'h'.repeat(64),
    }),
    findLastFailureCode: vi.fn().mockResolvedValue(null),
    findByIdempotencyKey: vi.fn().mockResolvedValue(null),
    findRetryChild: vi.fn().mockResolvedValue(null),
    createQueued: vi.fn(async (input: Record<string, unknown>) => {
      created.push(input);
      return {
        result: GenerationJobStorageResult.SUCCESS,
        job: { id: 'job-new', status: 'QUEUED', correlationId: 'c', budgetId: 'b' },
      };
    }),
    leaseDispatch: vi.fn().mockResolvedValue(true),
    inheritCheckpoints: vi.fn(inherit),
  };
  const service = new GenerationJobsService(
    { getOwnedSnapshot: vi.fn() } as never,
    repository as never,
    { publishConfirmed: vi.fn().mockResolvedValue(undefined) } as never,
    {} as never,
    { reserve: vi.fn().mockResolvedValue({ id: 'budget-new' }), close: vi.fn() } as never,
    { record: vi.fn() } as never,
  );
  return { service, repository, created };
}

describe('a retry resumes at the failed phase (ADR-181)', () => {
  it('copies the finished work, minus the roles whose model the owner changed', async () => {
    const { service, repository } = build();

    await service.retry('job-old', {
      ownerId: 'owner-1',
      idempotencyKey: 'retry-1',
      models: [{ roleId: 'judge', provider: 'GEMINI', model: 'flash' }],
    });

    expect(repository.inheritCheckpoints).toHaveBeenCalledWith(
      'job-old',
      'job-new',
      ['judge'],
      false,
    );
  });

  it('inherits everything when only the key changes (Try again)', async () => {
    const { service, repository } = build();
    await service.retry('job-old', { ownerId: 'owner-1', idempotencyKey: 'retry-1' });
    expect(repository.inheritCheckpoints).toHaveBeenCalledWith('job-old', 'job-new', [], false);
  });

  it('keeps research but invalidates all cached replies after a rejected review', async () => {
    const { service, repository } = build();
    repository.findLastFailureCode.mockResolvedValue('REVIEW_NOT_PASSED');

    await service.retry('job-old', {
      ownerId: 'owner-1',
      idempotencyKey: 'retry-review',
      models: [{ roleId: 'judge', provider: 'GEMINI', model: 'flash' }],
    });

    expect(repository.inheritCheckpoints).toHaveBeenCalledWith(
      'job-old',
      'job-new',
      ['author-1', 'author-2', 'author-3', 'judge', 'critic'],
      false,
    );
  });

  it('starts from scratch when the owner changed the topic: new research, new drafts', async () => {
    const { service, repository } = build();
    await service.retry('job-old', {
      ownerId: 'owner-1',
      idempotencyKey: 'retry-1',
      topic: 'A completely different topic text',
    });
    expect(repository.inheritCheckpoints).not.toHaveBeenCalled();
  });

  it('still queues and dispatches the retry when the copy fails', async () => {
    const { service, repository } = build(() => Promise.reject(new Error('db down')));
    const result = await service.retry('job-old', {
      ownerId: 'owner-1',
      idempotencyKey: 'retry-1',
    });
    expect(result).toEqual({ jobId: 'job-new', status: 'QUEUED' });
    expect(repository.leaseDispatch).toHaveBeenCalled();
  });

  it('pins the shorter-article remedy into the new job request', async () => {
    const { service, created } = build();
    await service.retry('job-old', {
      ownerId: 'owner-1',
      idempotencyKey: 'retry-1',
      articleLength: ThreadArticleLength.SHORT,
    });
    expect(created[0]).toMatchObject({ articleLength: ThreadArticleLength.SHORT });
  });

  it('asks the repository to skip the research and every reply when the owner wants more research', async () => {
    const { service, repository } = build();

    await service.retry('job-old', {
      ownerId: 'owner-1',
      idempotencyKey: 'retry-refresh',
      refreshResearch: true,
    });

    expect(repository.inheritCheckpoints).toHaveBeenCalledWith('job-old', 'job-new', [], true);
  });
});
