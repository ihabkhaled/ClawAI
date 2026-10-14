import { GenerationProgressService } from '../generation-progress.service';

const request = {
  sourceThreadId: 't1',
  topic: 'A sufficiently detailed topic',
  publicationType: 'ARTICLE',
  contentLocale: 'en',
  authors: [1, 2, 3].map((n) => ({
    id: `author-${String(n)}`,
    provider: 'GEMINI',
    model: 'flash',
    maxOutputTokens: 4096,
    fallbacks: [],
  })),
  judge: { id: 'judge', provider: 'GEMINI', model: 'flash', maxOutputTokens: 4096, fallbacks: [] },
  critic: {
    id: 'critic',
    provider: 'GEMINI',
    model: 'flash',
    maxOutputTokens: 4096,
    fallbacks: [],
  },
};

function job(overrides: Record<string, unknown>) {
  return {
    id: 'job-1',
    status: 'QUEUED',
    stage: 'SNAPSHOT',
    round: 0,
    attemptCount: 0,
    spentMicroCredits: 0n,
    budgetCloseStatus: null,
    spendCapMicroUsd: 1_000_000n,
    sourceThreadId: 't1',
    safeErrorCode: null,
    request,
    createdAt: new Date('2026-10-14T10:00:00Z'),
    updatedAt: new Date('2026-10-14T10:00:00Z'),
    nextAttemptAt: new Date('2026-10-14T10:00:00Z'),
    ...overrides,
  };
}

function build(row: ReturnType<typeof job>, ahead = 0) {
  const jobs = {
    findProgressJob: vi.fn().mockResolvedValue(row),
    countQueuedAhead: vi.fn().mockResolvedValue(ahead),
  };
  const steps = { list: vi.fn().mockResolvedValue([]) };
  return { service: new GenerationProgressService(jobs as never, steps as never), jobs };
}

describe('owner progress carries the queue state (ADR-183)', () => {
  it('reports how many runnable jobs are ahead of a job waiting for a worker', async () => {
    const { service, jobs } = build(job({}), 5);

    const progress = await service.getProgress('job-1', 'owner-1');

    expect(progress.queue).toEqual({ state: 'WAITING_FOR_WORKER', ahead: 5, retryAt: null });
    expect(jobs.countQueuedAhead).toHaveBeenCalledWith(expect.objectContaining({ id: 'job-1' }));
  });

  it('reports a scheduled retry instead of a place in line while the back-off runs', async () => {
    const later = new Date(Date.now() + 60_000);
    const { service, jobs } = build(job({ nextAttemptAt: later }));

    const progress = await service.getProgress('job-1', 'owner-1');

    expect(progress.queue).toEqual({ state: 'BACKOFF', ahead: 0, retryAt: later.toISOString() });
    expect(jobs.countQueuedAhead).not.toHaveBeenCalled();
  });

  it('has no queue once the job runs', async () => {
    const { service, jobs } = build(job({ status: 'RUNNING' }));

    expect((await service.getProgress('job-1', 'owner-1')).queue).toBeNull();
    expect(jobs.countQueuedAhead).not.toHaveBeenCalled();
  });
});
