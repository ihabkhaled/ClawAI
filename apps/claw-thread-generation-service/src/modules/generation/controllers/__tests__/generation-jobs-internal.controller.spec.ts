import { GenerationJobsInternalController } from '../generation-jobs-internal.controller';

describe('GenerationJobsInternalController owner routes', () => {
  const jobs = {
    retry: vi.fn().mockResolvedValue({ jobId: 'new', status: 'QUEUED' }),
    deleteJob: vi.fn().mockResolvedValue({ jobId: 'job-1', deleted: true }),
  };
  const progress = { getProgress: vi.fn().mockResolvedValue({ jobId: 'job-1' }) };
  const controller = new GenerationJobsInternalController(jobs as never, progress as never);

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
});
