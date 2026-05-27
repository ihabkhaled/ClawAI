import { PullJobPhase, PullJobStatus } from '../../../common/enums';
import { PullJobResumeManager } from '../managers/pull-job-resume.manager';
import { type PullJobRunnerManager } from '../managers/pull-job-runner.manager';
import { type PullJobsRepository } from '../repositories/pull-jobs.repository';
import { type PullJob } from '../types/pull-job.types';

const baseJob = (overrides: Partial<PullJob> = {}): PullJob => ({
  id: 'job-1',
  modelId: 'model-1',
  status: PullJobStatus.RUNNING,
  phase: PullJobPhase.DOWNLOADING,
  totalBytes: 100n,
  downloadedBytes: 50n,
  totalFiles: 1,
  completedFiles: 0,
  currentFile: 'weights.gguf',
  installStep: null,
  installAttempts: 0,
  retryAttempts: 0,
  resumedAt: null,
  lastProgressAt: null,
  reasonCode: null,
  errorMessage: null,
  startedAt: new Date(),
  completedAt: null,
  initiatedByUser: null,
  ...overrides,
});

describe('PullJobResumeManager', () => {
  let jobsRepo: { findAllResumable: jest.Mock };
  let runner: { run: jest.Mock; isRunning: jest.Mock };
  let manager: PullJobResumeManager;

  beforeEach(() => {
    jobsRepo = { findAllResumable: jest.fn() };
    runner = { run: jest.fn().mockResolvedValue(undefined), isRunning: jest.fn().mockReturnValue(false) };
    manager = new PullJobResumeManager(
      jobsRepo as unknown as PullJobsRepository,
      runner as unknown as PullJobRunnerManager,
    );
  });

  it('does nothing when there are no resumable jobs', async () => {
    jobsRepo.findAllResumable.mockResolvedValue([]);
    await manager.onApplicationBootstrap();
    expect(runner.run).not.toHaveBeenCalled();
  });

  it('resumes every non-terminal job', async () => {
    jobsRepo.findAllResumable.mockResolvedValue([
      baseJob({ id: 'job-1' }),
      baseJob({ id: 'job-2', status: PullJobStatus.INSTALLING, phase: PullJobPhase.INSTALLING }),
    ]);
    await manager.onApplicationBootstrap();
    expect(runner.run).toHaveBeenCalledTimes(2);
    expect(runner.run).toHaveBeenCalledWith('job-1', true);
    expect(runner.run).toHaveBeenCalledWith('job-2', true);
  });

  it('skips jobs already running', async () => {
    runner.isRunning.mockImplementation((id: string) => id === 'job-1');
    jobsRepo.findAllResumable.mockResolvedValue([baseJob({ id: 'job-1' }), baseJob({ id: 'job-2' })]);
    await manager.onApplicationBootstrap();
    expect(runner.run).toHaveBeenCalledTimes(1);
    expect(runner.run).toHaveBeenCalledWith('job-2', true);
  });

  it('swallows scan errors without crashing', async () => {
    jobsRepo.findAllResumable.mockRejectedValue(new Error('db down'));
    await expect(manager.onApplicationBootstrap()).resolves.not.toThrow();
    expect(runner.run).not.toHaveBeenCalled();
  });
});
