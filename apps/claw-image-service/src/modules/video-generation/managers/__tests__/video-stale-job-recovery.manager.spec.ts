import { vi } from 'vitest';

import { VideoStaleJobRecoveryManager } from '../video-stale-job-recovery.manager';

describe('VideoStaleJobRecoveryManager', () => {
  let repository: { findStale: ReturnType<typeof vi.fn>; timeOutIfStale: ReturnType<typeof vi.fn> };
  let execution: { releaseAbandoned: ReturnType<typeof vi.fn> };
  let manager: VideoStaleJobRecoveryManager;

  beforeEach(() => {
    repository = {
      findStale: vi.fn().mockResolvedValue([
        { id: 'a', paygReservationId: 'res-a' },
        { id: 'b', paygReservationId: null },
        { id: 'c', paygReservationId: 'res-c' },
      ]),
      timeOutIfStale: vi
        .fn()
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false),
    };
    execution = { releaseAbandoned: vi.fn().mockResolvedValue(undefined) };
    manager = new VideoStaleJobRecoveryManager(repository as never, execution as never);
  });

  it('times out orphans and releases the hold of only the rows it actually moved', async () => {
    const recovered = await manager.sweep(0);

    expect(recovered).toBe(2);
    expect(repository.timeOutIfStale).toHaveBeenCalledWith(
      'a',
      expect.any(Date),
      expect.objectContaining({ errorCode: 'VIDEO_GENERATION_INTERRUPTED' }),
    );
    // 'b' had no hold; 'c' was finished by its live process first (the write lost).
    expect(execution.releaseAbandoned).toHaveBeenCalledTimes(1);
    expect(execution.releaseAbandoned).toHaveBeenCalledWith('res-a', 'a');
  });

  it('is single-flight and never throws', async () => {
    repository.findStale.mockRejectedValue(new Error('db down'));

    await expect(manager.sweep(0)).resolves.toBe(0);
  });
});
