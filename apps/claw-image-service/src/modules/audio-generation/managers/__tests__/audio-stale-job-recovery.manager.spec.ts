import { vi } from 'vitest';

import { AudioStaleJobRecoveryManager } from '../audio-stale-job-recovery.manager';

describe('AudioStaleJobRecoveryManager', () => {
  const repo = { findStale: vi.fn(), timeOutIfStale: vi.fn() };
  const execution = { releaseAbandoned: vi.fn() };
  let manager: AudioStaleJobRecoveryManager;

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new AudioStaleJobRecoveryManager(repo as never, execution as never);
  });

  it('times out an orphan and releases only the holds of rows it moved', async () => {
    repo.findStale.mockResolvedValue([
      { id: 'a', paygReservationId: 'res-a' },
      { id: 'b', paygReservationId: 'res-b' },
      { id: 'c', paygReservationId: null },
    ]);
    repo.timeOutIfStale
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);

    expect(await manager.sweep(0)).toBe(2);
    expect(execution.releaseAbandoned).toHaveBeenCalledTimes(1);
    expect(execution.releaseAbandoned).toHaveBeenCalledWith('res-a', 'a');
    expect(repo.timeOutIfStale.mock.calls[0]?.[2]).toMatchObject({
      errorCode: 'AUDIO_GENERATION_INTERRUPTED',
    });
  });

  it('never throws', async () => {
    repo.findStale.mockRejectedValue(new Error('db down'));

    expect(await manager.sweep(0)).toBe(0);
  });
});
