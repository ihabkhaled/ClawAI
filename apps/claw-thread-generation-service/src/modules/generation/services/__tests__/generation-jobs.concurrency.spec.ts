import { Locale } from '@claw/shared-types';

import {
  GENERATION_OWNER_MAX_RUNNING,
  GENERATION_REPLICA_CONCURRENCY,
  GENERATION_WORKER_SLOT_COUNT,
} from '../../constants/generation.constants';
import { GenerationJobsService } from '../generation-jobs.service';

type Event = { jobId: string; correlationId: string };
type FakeJob = {
  id: string;
  ownerId: string;
  status: 'QUEUED' | 'RUNNING' | 'DONE' | 'FAILED';
  attemptCount: number;
};

const role = (id: string) => ({
  id,
  provider: 'OPENAI',
  model: 'gpt-5',
  maxOutputTokens: 1024,
  fallbacks: [],
});

const flush = async (): Promise<void> => {
  for (let turn = 0; turn < 5; turn += 1) await new Promise<void>((done) => setImmediate(done));
};

/** A broker with a prefetch window: it hands a consumer at most `prefetch` unacked messages. */
function createBroker(prefetch: number) {
  const queue: Event[] = [];
  let handler: ((event: unknown) => Promise<void>) | undefined;
  let inFlight = 0;
  function settle(work: Promise<void>): void {
    void work
      .catch(() => {})
      .finally(() => {
        inFlight -= 1;
        pump();
      });
  }
  function pump(): void {
    while (handler && inFlight < prefetch && queue.length > 0) {
      inFlight += 1;
      settle(handler(queue.shift()));
    }
  }
  return {
    subscribe: (_pattern: unknown, callback: typeof handler) => {
      handler = callback;
      pump();
      return Promise.resolve();
    },
    publishConfirmed: vi.fn().mockResolvedValue(undefined),
    publish: (jobId: string) => {
      queue.push({ jobId, correlationId: `correlation-${jobId}` });
      pump();
    },
    pending: () => queue.length,
    inFlight: () => inFlight,
  };
}

/**
 * An in-memory store with the claim contract of the real repository: claims of one owner are
 * serialised by a lock, the owner cap and the slot count are enforced inside it, and a refused
 * claim leaves the job QUEUED.
 */
function createStore(jobs: FakeJob[], slots: number) {
  const byId = new Map(jobs.map((job) => [job.id, job]));
  const locks = new Map<string, Promise<void>>();
  const slotOwners = new Set<string>();
  const request = {
    ownerId: 'x',
    sourceThreadId: 't',
    idempotencyKey: 'k',
    correlationId: 'c',
    spendCapMicroUsd: '5000000',
    topic: 'A detailed topic for a publication',
    publicationType: 'article',
    contentLocale: Locale.EN,
    publicIntentVersion: 'threads-public-v1',
    authors: [role('author-1'), role('author-2'), role('author-3')],
    judge: role('judge'),
    critic: role('critic'),
  };
  const withOwnerLock = async <T>(ownerId: string, work: () => Promise<T>): Promise<T> => {
    const previous = locks.get(ownerId) ?? Promise.resolve();
    let release: () => void = () => {};
    locks.set(
      ownerId,
      new Promise<void>((resolve) => {
        release = resolve;
      }),
    );
    await previous;
    try {
      return await work();
    } finally {
      release();
    }
  };
  const repository = {
    claim: vi.fn(async (id: string) => {
      const job = byId.get(id);
      if (job?.status !== 'QUEUED') return null;
      return withOwnerLock(job.ownerId, async () => {
        await Promise.resolve();
        const running = [...byId.values()].filter(
          (other) => other.ownerId === job.ownerId && other.status === 'RUNNING',
        ).length;
        if (job.status !== 'QUEUED' || running >= GENERATION_OWNER_MAX_RUNNING) return null;
        if (slotOwners.size >= slots) return null;
        job.status = 'RUNNING';
        job.attemptCount += 1;
        slotOwners.add(job.id);
        return {
          ...job,
          budgetId: `budget-${job.id}`,
          request: { ...request, ownerId: job.ownerId },
          sourceSnapshot: { messages: [] },
        };
      });
    }),
    heartbeat: vi.fn().mockResolvedValue(true),
    isCancellationRequested: vi.fn().mockResolvedValue(false),
    saveResult: vi.fn(async (id: string) => {
      const job = byId.get(id);
      if (job) job.status = 'DONE';
      return true;
    }),
    completeAttempt: vi.fn(async (id: string) => {
      slotOwners.delete(id);
    }),
    retryOrFail: vi.fn(async (id: string) => {
      const job = byId.get(id);
      if (job) job.status = 'FAILED';
      slotOwners.delete(id);
      return 'FAILED';
    }),
    markBudgetClosed: vi.fn().mockResolvedValue(undefined),
    recordBudgetCloseFailure: vi.fn().mockResolvedValue(null),
  };
  return { repository, byId };
}

function setup(jobs: FakeJob[], options: { prefetch?: number; slots?: number } = {}) {
  const broker = createBroker(options.prefetch ?? GENERATION_REPLICA_CONCURRENCY);
  const store = createStore(jobs, options.slots ?? GENERATION_WORKER_SLOT_COUNT);
  const started: string[] = [];
  const gates = new Map<string, { finish: () => void; fail: (error: Error) => void }>();
  let concurrent = 0;
  let peak = 0;
  const pipeline = {
    generate: vi.fn(
      (input: { jobId: string }) =>
        new Promise((resolve, reject) => {
          started.push(input.jobId);
          concurrent += 1;
          peak = Math.max(peak, concurrent);
          gates.set(input.jobId, {
            finish: () => {
              concurrent -= 1;
              resolve({ rounds: 1 });
            },
            fail: (error) => {
              concurrent -= 1;
              reject(error);
            },
          });
        }),
    ),
  };
  const budgets = { close: vi.fn().mockResolvedValue(undefined) };
  const recorder = { record: vi.fn().mockResolvedValue(undefined) };
  const service = new GenerationJobsService(
    {} as never,
    store.repository as never,
    broker as never,
    pipeline as never,
    budgets as never,
    recorder as never,
  );
  return {
    service,
    broker,
    store,
    started,
    budgets,
    peak: () => peak,
    finish: async (jobId: string) => {
      gates.get(jobId)?.finish();
      await flush();
    },
    fail: async (jobId: string, error: Error) => {
      gates.get(jobId)?.fail(error);
      await flush();
    },
  };
}

const queued = (id: string, ownerId: string): FakeJob => ({
  id,
  ownerId,
  status: 'QUEUED',
  attemptCount: 0,
});

describe('GenerationJobsService concurrency', () => {
  it('runs several jobs of different users at once, up to the replica concurrency', async () => {
    const ids = Array.from({ length: GENERATION_REPLICA_CONCURRENCY + 2 }, (_, index) =>
      String.fromCharCode(97 + index),
    );
    const run = setup(ids.map((id) => queued(id, `owner-${id}`)));
    await run.service.subscribe();

    for (const id of ids) run.broker.publish(id);
    await flush();

    const firstWave = ids.slice(0, GENERATION_REPLICA_CONCURRENCY);
    expect(run.started).toEqual(firstWave);
    expect(run.broker.pending()).toBe(2);

    await run.finish(ids[0] as string);
    expect(run.started).toEqual([...firstWave, ids[GENERATION_REPLICA_CONCURRENCY]]);
    for (const id of ids.slice(1)) await run.finish(id);

    expect(run.started).toEqual(ids);
    expect(run.peak()).toBe(GENERATION_REPLICA_CONCURRENCY);
    expect([...run.store.byId.values()].every((job) => job.status === 'DONE')).toBe(true);
  });

  it('lets one user hold only the owner maximum, and a later user still starts', async () => {
    const jobs = [
      ...['a1', 'a2', 'a3', 'a4', 'a5', 'a6'].map((id) => queued(id, 'owner-a')),
      queued('b1', 'owner-b'),
    ];
    const run = setup(jobs);
    await run.service.subscribe();

    for (const job of jobs) run.broker.publish(job.id);
    await flush();

    // A holds its two, A's other four were deferred (acked, still queued), B was not stuck behind them.
    expect(run.started).toEqual(['a1', 'a2', 'b1']);
    for (const id of ['a3', 'a4', 'a5', 'a6'])
      expect(run.store.byId.get(id)?.status).toBe('QUEUED');
    expect(run.broker.pending()).toBe(0);
    expect(run.budgets.close).not.toHaveBeenCalled();
    expect(run.store.repository.retryOrFail).not.toHaveBeenCalled();
    expect(run.store.byId.get('a3')?.attemptCount).toBe(0);
  });

  it('starts a deferred job when the sweep re-publishes it after a slot of its owner frees', async () => {
    const jobs = ['a1', 'a2', 'a3'].map((id) => queued(id, 'owner-a'));
    const run = setup(jobs);
    await run.service.subscribe();
    for (const job of jobs) run.broker.publish(job.id);
    await flush();
    expect(run.started).toEqual(['a1', 'a2']);

    await run.finish('a1');
    run.broker.publish('a3');
    await flush();

    expect(run.started).toEqual(['a1', 'a2', 'a3']);
  });

  it('never over-claims when one owner events race: exactly the maximum start', async () => {
    const jobs = Array.from({ length: 8 }, (_, index) => queued(`r${String(index)}`, 'owner-r'));
    const run = setup(jobs, { prefetch: 8, slots: 8 });
    await run.service.subscribe();

    for (const job of jobs) run.broker.publish(job.id);
    await flush();

    expect(run.started).toHaveLength(GENERATION_OWNER_MAX_RUNNING);
    expect(run.peak()).toBe(GENERATION_OWNER_MAX_RUNNING);
  });

  it('runs a duplicate delivery of one job exactly once (at-least-once safe)', async () => {
    const run = setup([queued('a', 'owner-a')]);
    await run.service.subscribe();

    run.broker.publish('a');
    run.broker.publish('a');
    run.broker.publish('a');
    await flush();
    await run.finish('a');
    run.broker.publish('a');
    await flush();

    expect(run.started).toEqual(['a']);
    expect(run.store.byId.get('a')?.attemptCount).toBe(1);
  });

  it('never runs more jobs than there are worker slots, and defers the rest untouched', async () => {
    const jobs = ['a', 'b', 'c', 'd'].map((id) => queued(id, `owner-${id}`));
    const run = setup(jobs, { prefetch: 4, slots: 2 });
    await run.service.subscribe();

    for (const job of jobs) run.broker.publish(job.id);
    await flush();

    expect(run.started).toEqual(['a', 'b']);
    expect(run.store.byId.get('c')?.status).toBe('QUEUED');
    expect(run.store.byId.get('c')?.attemptCount).toBe(0);
  });

  it('keeps the other jobs running when one job fails, and frees the failed job slot', async () => {
    const jobs = ['a', 'b', 'c'].map((id) => queued(id, `owner-${id}`));
    const run = setup(jobs);
    await run.service.subscribe();
    for (const job of jobs) run.broker.publish(job.id);
    await flush();

    await run.fail('b', new Error('boom'));

    expect(run.store.byId.get('b')?.status).toBe('FAILED');
    expect(run.store.byId.get('a')?.status).toBe('RUNNING');
    expect(run.store.byId.get('c')?.status).toBe('RUNNING');
    expect(run.broker.inFlight()).toBe(2);
    await run.finish('a');
    await run.finish('c');
    expect(run.store.byId.get('a')?.status).toBe('DONE');
  });
});
