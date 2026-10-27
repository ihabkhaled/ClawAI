import { Locale, ThreadPublicationType } from '@claw/shared-types';

import { GenerationJobStorageResult } from '../../../../common/enums/generation-job-storage-result.enum';
import { GenerationJobsService } from '../generation-jobs.service';

const role = (id: string) => ({
  id,
  provider: 'OPENAI',
  model: 'gpt-5',
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

const tick = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

/**
 * The budget service as the auth service will have it: reserving is idempotent per owner and
 * request id (the same pair answers the same budget), closing is idempotent per budget.
 */
function createIdempotentBudgets() {
  const byKey = new Map<string, string>();
  const closed: Array<{ budgetId: string; status: string }> = [];
  let counter = 0;
  return {
    closed,
    client: {
      reserve: vi.fn(async (userId: string, requestId: string) => {
        await tick();
        const key = `${userId}:${requestId}`;
        const existing = byKey.get(key);
        if (existing) return { id: existing };
        counter += 1;
        const id = `budget-${String(counter)}`;
        byKey.set(key, id);
        return { id };
      }),
      close: vi.fn(async (budgetId: string, status: string) => {
        await tick();
        closed.push({ budgetId, status });
      }),
    },
  };
}

type StoredJob = {
  id: string;
  ownerId: string;
  request: unknown;
  status: string;
  budgetId: string;
};

type CreateInput = { idempotencyKey: string; ownerId: string };

/** Job storage with the real unique constraints: idempotency key and retry link. */
function createJobStore(failStorage: boolean) {
  const byKey = new Map<string, StoredJob>();
  const byRetryLink = new Map<string, StoredJob>();
  let counter = 0;
  const same = (job: StoredJob, input: CreateInput) =>
    job.ownerId === input.ownerId && JSON.stringify(job.request) === JSON.stringify(input);
  const createQueued = async (
    input: CreateInput,
    _snapshot: unknown,
    _hash: string,
    budgetId: string,
    retriedFromJobId?: string,
  ) => {
    await tick();
    if (failStorage) return { result: GenerationJobStorageResult.STORAGE_ERROR };
    const raced = byKey.get(input.idempotencyKey);
    if (raced) {
      return same(raced, input)
        ? { result: GenerationJobStorageResult.SUCCESS, job: raced }
        : { result: GenerationJobStorageResult.CONFLICT };
    }
    if (retriedFromJobId && byRetryLink.has(retriedFromJobId)) {
      return { result: GenerationJobStorageResult.RETRY_CONFLICT };
    }
    counter += 1;
    const job: StoredJob = {
      id: `job-new-${String(counter)}`,
      ownerId: input.ownerId,
      request: input,
      status: 'QUEUED',
      budgetId,
    };
    byKey.set(input.idempotencyKey, job);
    if (retriedFromJobId) byRetryLink.set(retriedFromJobId, job);
    return { result: GenerationJobStorageResult.SUCCESS, job: { ...job, correlationId: 'c' } };
  };
  return {
    byKey,
    repository: {
      findRetrySource: vi.fn().mockResolvedValue({
        id: 'job-old',
        status: 'FAILED',
        request: original,
        sourceSnapshot: { messages: [] },
        sourceSnapshotHash: 'h'.repeat(64),
      }),
      findLastFailureCode: vi.fn().mockResolvedValue(null),
      findByIdempotencyKey: vi.fn(async (input: CreateInput) => {
        await tick();
        const job = byKey.get(input.idempotencyKey);
        if (!job) return null;
        return same(job, input)
          ? { result: GenerationJobStorageResult.SUCCESS, job: { ...job, correlationId: 'c' } }
          : { result: GenerationJobStorageResult.CONFLICT };
      }),
      findRetryChild: vi.fn(async (sourceId: string) => {
        await tick();
        return byRetryLink.get(sourceId) ?? null;
      }),
      createQueued: vi.fn(createQueued),
      leaseDispatch: vi.fn().mockResolvedValue(true),
    },
  };
}

function build(options: { failStorage?: boolean } = {}) {
  const budgets = createIdempotentBudgets();
  const store = createJobStore(options.failStorage ?? false);
  const service = new GenerationJobsService(
    { getOwnedSnapshot: vi.fn() } as never,
    store.repository as never,
    { publishConfirmed: vi.fn().mockResolvedValue(undefined) } as never,
    {} as never,
    budgets.client as never,
    { record: vi.fn() } as never,
  );
  return { service, budgets, store };
}

const retryWith = (service: GenerationJobsService, idempotencyKey: string) =>
  service.retry('job-old', { ownerId: 'owner-1', idempotencyKey });

describe('owner retry with an idempotent budget reservation', () => {
  it('two concurrent retries with different keys store one job and release only the loser budget', async () => {
    const { service, budgets, store } = build();

    const results = await Promise.allSettled([
      retryWith(service, 'retry-a'),
      retryWith(service, 'retry-b'),
    ]);

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
    expect(store.byKey.size).toBe(1);
    const winner = [...store.byKey.values()][0];
    expect(budgets.closed).toHaveLength(1);
    expect(budgets.closed[0]?.status).toBe('RELEASED');
    expect(budgets.closed[0]?.budgetId).not.toBe(winner?.budgetId);
  });

  it('concurrent retries with the SAME key share one budget and release nothing', async () => {
    const { service, budgets, store } = build();

    const results = await Promise.all([
      retryWith(service, 'retry-a'),
      retryWith(service, 'retry-a'),
      retryWith(service, 'retry-a'),
    ]);

    expect(new Set(results.map((result) => result.jobId)).size).toBe(1);
    expect(store.byKey.size).toBe(1);
    expect(budgets.closed).toEqual([]);
    const reserved = await Promise.all(budgets.client.reserve.mock.results.map((r) => r.value));
    expect(new Set(reserved.map((budget: { id: string }) => budget.id)).size).toBe(1);
  });

  it('replaying a finished retry with its key reserves nothing', async () => {
    const { service, budgets } = build();
    const first = await retryWith(service, 'retry-a');
    budgets.client.reserve.mockClear();

    const again = await retryWith(service, 'retry-a');

    expect(again.jobId).toBe(first.jobId);
    expect(budgets.client.reserve).not.toHaveBeenCalled();
    expect(budgets.closed).toEqual([]);
  });

  it('a later retry with a new key returns the winner without a second reservation', async () => {
    const { service, budgets } = build();
    const winner = await retryWith(service, 'retry-a');
    budgets.client.reserve.mockClear();

    const later = await retryWith(service, 'retry-z');

    expect(later.jobId).toBe(winner.jobId);
    expect(budgets.client.reserve).not.toHaveBeenCalled();
  });

  it('releases the budget when the job could not be stored and no job holds the key', async () => {
    const { service, budgets } = build({ failStorage: true });

    await expect(retryWith(service, 'retry-a')).rejects.toThrow('could not be stored');

    expect(budgets.closed).toEqual([{ budgetId: 'budget-1', status: 'RELEASED' }]);
  });

  it('keeps a shared budget when another request stored a job under the same key', async () => {
    const { service, budgets, store } = build({ failStorage: true });
    store.repository.findByIdempotencyKey.mockResolvedValueOnce(null).mockResolvedValue({
      result: GenerationJobStorageResult.SUCCESS,
      job: { id: 'job-other', status: 'QUEUED', correlationId: 'c' },
    } as never);

    await expect(retryWith(service, 'retry-a')).rejects.toThrow('could not be stored');

    expect(budgets.closed).toEqual([]);
  });
});
