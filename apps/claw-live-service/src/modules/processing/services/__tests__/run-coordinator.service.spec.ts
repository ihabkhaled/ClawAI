import { LiveCapability, LiveMode, LiveSourceKind } from '../../../../generated/prisma';
import { PIPELINE_VERSION } from '../../constants/processing.constants';
import { computeProcessingKey } from '../../utilities/processing-key.utility';
import { RunCoordinatorService } from '../run-coordinator.service';

const stream = {
  id: 'st1',
  sourceKind: LiveSourceKind.HLS,
  sourceIdentity: 'ident',
  accessScope: 'PUBLIC',
  capability: LiveCapability.AUDIO_VISION,
};

const basePolicy = {
  featureEnabled: true,
  killSwitch: false,
  maxActiveStreams: 20,
  dailyBudgetMicroUsd: 20_000_000,
  budgetSoftStopPercent: 80,
};

describe('RunCoordinatorService', () => {
  const runs = {
    findStream: vi.fn(),
    findByActiveKey: vi.fn(),
    createRun: vi.fn(),
    countAttachedViewers: vi.fn(),
    markStopping: vi.fn(),
    countRunningRuns: vi.fn(),
    providerCostSince: vi.fn(),
  };
  const policy = { active: vi.fn() };
  const service = new RunCoordinatorService(runs as never, policy as never);
  const key = computeProcessingKey(
    LiveSourceKind.HLS,
    'ident',
    'PUBLIC',
    LiveMode.AUDIO,
    PIPELINE_VERSION,
  );

  beforeEach(() => {
    vi.clearAllMocks();
    runs.findStream.mockResolvedValue(stream);
    policy.active.mockResolvedValue({ version: 1, config: { ...basePolicy } });
    runs.countRunningRuns.mockResolvedValue(0);
    runs.providerCostSince.mockResolvedValue(0);
  });

  it('joins the active run of the processing key', async () => {
    runs.findByActiveKey.mockResolvedValueOnce({ id: 'run-1' });
    await expect(service.attach({ streamId: 'st1', mode: LiveMode.AUDIO })).resolves.toEqual({
      runId: 'run-1',
      created: false,
    });
    expect(runs.findByActiveKey).toHaveBeenCalledWith(key);
    expect(runs.createRun).not.toHaveBeenCalled();
  });

  it('creates the run when none is active', async () => {
    runs.findByActiveKey.mockResolvedValueOnce(null);
    runs.createRun.mockResolvedValueOnce({ id: 'run-2' });
    await expect(service.attach({ streamId: 'st1', mode: LiveMode.AUDIO })).resolves.toEqual({
      runId: 'run-2',
      created: true,
    });
    expect(runs.createRun).toHaveBeenCalledWith('st1', key, LiveMode.AUDIO, PIPELINE_VERSION);
  });

  it('joins the winner when a concurrent create hits the activeKey unique (P2002)', async () => {
    runs.findByActiveKey.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'winner' });
    runs.createRun.mockRejectedValueOnce(Object.assign(new Error('unique'), { code: 'P2002' }));
    await expect(service.attach({ streamId: 'st1', mode: LiveMode.AUDIO })).resolves.toEqual({
      runId: 'winner',
      created: false,
    });
  });

  it('rethrows other errors and a P2002 with no winner', async () => {
    runs.findByActiveKey.mockResolvedValue(null);
    runs.createRun.mockRejectedValueOnce(new Error('db down'));
    await expect(service.attach({ streamId: 'st1', mode: LiveMode.AUDIO })).rejects.toThrow(
      'db down',
    );
    runs.createRun.mockRejectedValueOnce(Object.assign(new Error('unique'), { code: 'P2002' }));
    await expect(service.attach({ streamId: 'st1', mode: LiveMode.AUDIO })).rejects.toThrow(
      'unique',
    );
  });

  it('refuses a missing stream and a PLAYER_ONLY stream', async () => {
    runs.findStream.mockResolvedValueOnce(null);
    await expect(service.attach({ streamId: 'x', mode: LiveMode.AUDIO })).rejects.toThrow(
      'LIVE_STREAM_NOT_FOUND',
    );
    runs.findStream.mockResolvedValueOnce({ ...stream, capability: LiveCapability.PLAYER_ONLY });
    await expect(service.attach({ streamId: 'st1', mode: LiveMode.AUDIO })).rejects.toThrow(
      'LIVE_SOURCE_PLAYER_ONLY',
    );
  });

  it('stops the run only when the last attached viewer leaves', async () => {
    runs.countAttachedViewers.mockResolvedValueOnce(1);
    await service.onViewerDetached('run-1');
    expect(runs.markStopping).not.toHaveBeenCalled();
    runs.countAttachedViewers.mockResolvedValueOnce(0);
    await service.onViewerDetached('run-1');
    expect(runs.markStopping).toHaveBeenCalledWith('run-1');
  });

  describe('admissionRefusal', () => {
    it('admits under every limit', async () => {
      await expect(service.admissionRefusal()).resolves.toBeNull();
    });

    it('refuses DISABLED on kill switch or feature off', async () => {
      policy.active.mockResolvedValueOnce({
        version: 1,
        config: { ...basePolicy, killSwitch: true },
      });
      await expect(service.admissionRefusal()).resolves.toBe('DISABLED');
      policy.active.mockResolvedValueOnce({
        version: 1,
        config: { ...basePolicy, featureEnabled: false },
      });
      await expect(service.admissionRefusal()).resolves.toBe('DISABLED');
    });

    it('refuses CAPACITY at maxActiveStreams', async () => {
      runs.countRunningRuns.mockResolvedValueOnce(20);
      await expect(service.admissionRefusal()).resolves.toBe('CAPACITY');
    });

    it('refuses CAPACITY at the daily budget soft stop', async () => {
      runs.providerCostSince.mockResolvedValueOnce(15_999_999);
      await expect(service.admissionRefusal()).resolves.toBeNull();
      runs.providerCostSince.mockResolvedValueOnce(16_000_000);
      await expect(service.admissionRefusal()).resolves.toBe('CAPACITY');
      const since = runs.providerCostSince.mock.calls[0]?.[0] as Date;
      expect(since.getUTCHours()).toBe(0);
    });
  });
});
