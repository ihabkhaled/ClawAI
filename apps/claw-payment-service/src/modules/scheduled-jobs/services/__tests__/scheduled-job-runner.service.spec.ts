import type { RedisService } from '../../../../infrastructure/redis/redis.service';
import { ScheduledJobRunnerService } from '../scheduled-job-runner.service';

describe('ScheduledJobRunnerService', () => {
  const options = {
    jobName: 'test-job',
    lockKey: 'locks:test-job',
    lockTtlSeconds: 60,
  };
  let redis: jest.Mocked<Pick<RedisService, 'acquireLock' | 'releaseLock'>>;
  let service: ScheduledJobRunnerService;

  beforeEach(() => {
    redis = {
      acquireLock: jest.fn<Promise<boolean>, [string, string, number]>(async () => true),
      releaseLock: jest.fn<Promise<boolean>, [string, string]>(async () => true),
    };
    service = new ScheduledJobRunnerService(redis as unknown as RedisService);
  });

  it('runs a job once and releases its owner-token lock', async () => {
    const job = jest.fn(async () => 7);

    await expect(service.run(options, job)).resolves.toBe(7);
    expect(job).toHaveBeenCalledTimes(1);
    expect(redis.acquireLock).toHaveBeenCalledWith(
      options.lockKey,
      expect.any(String),
      options.lockTtlSeconds,
    );
    expect(redis.releaseLock).toHaveBeenCalledWith(options.lockKey, expect.any(String));
    expect(redis.acquireLock.mock.calls[0]?.[1]).toBe(redis.releaseLock.mock.calls[0]?.[1]);
  });

  it('returns null without running when another replica owns the lock', async () => {
    redis.acquireLock.mockResolvedValueOnce(false);
    const job = jest.fn(async () => 7);

    await expect(service.run(options, job)).resolves.toBeNull();
    expect(job).not.toHaveBeenCalled();
    expect(redis.releaseLock).not.toHaveBeenCalled();
  });

  it('logs and propagates a Redis acquisition failure without attempting release', async () => {
    const failure = new Error('redis unavailable');
    redis.acquireLock.mockRejectedValueOnce(failure);

    await expect(service.run(options, async () => 7)).rejects.toBe(failure);
    expect(redis.releaseLock).not.toHaveBeenCalled();
  });

  it('attempts owner-safe release when the job fails', async () => {
    const failure = new Error('job failed');
    const job = jest.fn(async () => {
      throw failure;
    });

    await expect(service.run(options, job)).rejects.toBe(failure);
    expect(redis.releaseLock).toHaveBeenCalledWith(options.lockKey, expect.any(String));
  });

  it('does not replace a successful job result when the expired lock has a new owner', async () => {
    redis.releaseLock.mockResolvedValueOnce(false);

    await expect(service.run(options, async () => 'complete')).resolves.toBe('complete');
  });

  it('does not replace the job outcome when Redis release fails', async () => {
    redis.releaseLock.mockRejectedValueOnce(new Error('redis unavailable'));

    await expect(service.run(options, async () => 'complete')).resolves.toBe('complete');
  });
});
