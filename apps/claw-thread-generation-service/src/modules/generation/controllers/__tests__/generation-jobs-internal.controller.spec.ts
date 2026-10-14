import { GenerationJobsInternalController } from '../generation-jobs-internal.controller';

describe('GenerationJobsInternalController owner routes', () => {
  const jobs = {
    retry: vi.fn().mockResolvedValue({ jobId: 'new', status: 'QUEUED' }),
    deleteJob: vi.fn().mockResolvedValue({ jobId: 'job-1', deleted: true }),
  };
  const progress = { getProgress: vi.fn().mockResolvedValue({ jobId: 'job-1' }) };
  const recorder = {
    recentModelHealth: vi.fn().mockResolvedValue(
      new Map([
        ['GEMINI/gemini-2.5-flash', { ok: 1, failed: 9 }],
        ['OLLAMA/gpt-oss:120b', { ok: 5, failed: 0 }],
      ]),
    ),
  };
  const controller = new GenerationJobsInternalController(
    jobs as never,
    progress as never,
    recorder as never,
  );

  it('delegates progress to the owner-scoped service', async () => {
    await expect(controller.getProgress('job-1', { ownerId: 'owner-1' })).resolves.toEqual({
      jobId: 'job-1',
    });
    expect(progress.getProgress).toHaveBeenCalledWith('job-1', 'owner-1');
  });

  it('delegates retry with the full body', async () => {
    const body = { ownerId: 'owner-1', idempotencyKey: 'k' };
    await controller.retry('job-1', body);
    expect(jobs.retry).toHaveBeenCalledWith('job-1', body);
  });

  it('delegates delete with the owner', async () => {
    await controller.remove('job-1', { ownerId: 'owner-1' });
    expect(jobs.deleteJob).toHaveBeenCalledWith('job-1', 'owner-1');
  });

  it('reports recent model health as counts only, splitting provider from a model that holds a slash or colon', async () => {
    const report = await controller.modelHealth();
    expect(report.windowMs).toBe(3_600_000);
    expect(report.models).toEqual([
      { provider: 'GEMINI', model: 'gemini-2.5-flash', ok: 1, failed: 9 },
      { provider: 'OLLAMA', model: 'gpt-oss:120b', ok: 5, failed: 0 },
    ]);
  });
});
