import { LiveHeartbeatState } from '../../../../common/enums/live-heartbeat-state.enum';
import { LiveSettleOutcome } from '../../../../common/enums/live-settle-outcome.enum';
import { LiveStatusCode } from '../../../../common/enums/live-status-code.enum';
import { LiveRunStatus, LiveSessionState } from '../../../../generated/prisma';
import { LiveHeartbeatManager } from '../live-heartbeat.manager';

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: 'sess1',
    userId: 'user1',
    runId: 'run1',
    state: LiveSessionState.ACTIVE,
    lastHeartbeatAt: new Date(Date.now() - 10_000),
    lastPlaybackAt: 1n,
    pendingSeconds: 0,
    ...overrides,
  };
}

function setup(
  options: { accrued?: number; runStatus?: LiveRunStatus; after?: Record<string, unknown>[] } = {},
) {
  const reads = (options.after ?? [{}]).map((o) => row(o));
  const sessions = {
    findRun: vi.fn().mockResolvedValue({
      status: options.runStatus ?? LiveRunStatus.ACTIVE,
      lastCommitAt: new Date(),
    }),
    recordHeartbeat: vi.fn().mockResolvedValue(true),
    touch: vi.fn().mockResolvedValue(undefined),
    findById: vi.fn(),
  };
  for (const read of reads) sessions.findById.mockResolvedValueOnce(read);
  sessions.findById.mockResolvedValue(reads.at(-1));
  const presence = { touch: vi.fn(), accrue: vi.fn().mockResolvedValue(options.accrued ?? 10) };
  const coverage = { record: vi.fn() };
  const billing = {
    settleBlock: vi
      .fn()
      .mockResolvedValue({ outcome: LiveSettleOutcome.FREE, state: LiveSessionState.ACTIVE }),
    expireGraceIfDue: vi.fn().mockResolvedValue(LiveSessionState.EXHAUSTED),
  };
  const presenter = { usage: vi.fn().mockResolvedValue({ billedSeconds: 0 }) };
  const manager = new LiveHeartbeatManager(
    sessions as never,
    presence as never,
    coverage as never,
    billing as never,
    presenter as never,
  );
  return { manager, sessions, presence, coverage, billing };
}

const playing = { state: LiveHeartbeatState.PLAYING, playbackAt: 1000, atLiveEdge: true };
const paused = { state: LiveHeartbeatState.PAUSED, playbackAt: 1000, atLiveEdge: false };

describe('LiveHeartbeatManager', () => {
  it('accrues server-side while playing on an active run and records coverage', async () => {
    const { manager, sessions, presence, coverage } = setup();
    const view = await manager.beat(row() as never, playing);
    expect(presence.touch).toHaveBeenCalledWith('run1', 'sess1', expect.any(Number));
    expect(sessions.recordHeartbeat).toHaveBeenCalledWith(
      'sess1',
      expect.objectContaining({
        expectedState: LiveSessionState.ACTIVE,
        state: LiveSessionState.ACTIVE,
        pendingIncrement: 10,
      }),
    );
    expect(coverage.record).toHaveBeenCalled();
    expect(view.statusCode).toBe(LiveStatusCode.ANALYZING);
  });

  it('a summary session accrues the media seconds its run processed, never wall time', async () => {
    const { manager, sessions, presence } = setup();
    sessions.findRun.mockResolvedValue({
      status: LiveRunStatus.ENDED,
      lastCommitAt: new Date(),
      processedMediaSeconds: 754,
    });
    await manager.beat(row({ summary: true, accruedMediaSeconds: 600 }) as never, playing);
    expect(presence.accrue).not.toHaveBeenCalled();
    expect(sessions.recordHeartbeat).toHaveBeenCalledWith(
      'sess1',
      expect.objectContaining({ pendingIncrement: 154, media: { from: 600, to: 754 } }),
    );
  });

  it('a summary session with no new progress accrues nothing, never wall time', async () => {
    const { manager, sessions, presence } = setup();
    sessions.findRun.mockResolvedValue({
      status: LiveRunStatus.ACTIVE,
      lastCommitAt: new Date(),
      processedMediaSeconds: 60,
    });
    await manager.beat(row({ summary: true, accruedMediaSeconds: 60 }) as never, playing);
    expect(presence.accrue).not.toHaveBeenCalled();
    expect(sessions.recordHeartbeat).toHaveBeenCalledWith(
      'sess1',
      expect.objectContaining({ pendingIncrement: 0 }),
    );
  });

  it('accrues nothing while paused and moves the session to PAUSED', async () => {
    const { manager, sessions, presence, coverage } = setup();
    await manager.beat(row() as never, paused);
    expect(presence.accrue).not.toHaveBeenCalled();
    expect(coverage.record).not.toHaveBeenCalled();
    expect(sessions.recordHeartbeat).toHaveBeenCalledWith(
      'sess1',
      expect.objectContaining({ state: LiveSessionState.PAUSED, pendingIncrement: 0 }),
    );
  });

  it('accrues nothing while the run is stopping or long delayed', async () => {
    const { manager, presence } = setup({ runStatus: LiveRunStatus.STOPPING });
    await manager.beat(row() as never, playing);
    expect(presence.accrue).not.toHaveBeenCalled();
  });

  it('accrues nothing once credits are required', async () => {
    const { manager, presence } = setup();
    await manager.beat(row({ state: LiveSessionState.CREDITS_REQUIRED }) as never, playing);
    expect(presence.accrue).not.toHaveBeenCalled();
  });

  it('settles a full 60 s block once pending reaches it', async () => {
    const { manager, billing } = setup({ after: [{ pendingSeconds: 65 }, { pendingSeconds: 5 }] });
    await manager.beat(row() as never, playing);
    expect(billing.settleBlock).toHaveBeenCalledTimes(1);
    expect(billing.settleBlock).toHaveBeenCalledWith(
      expect.objectContaining({ pendingSeconds: 65 }),
      60,
    );
  });

  it('stops settling on a deferred block (meter outage)', async () => {
    const { manager, billing } = setup({
      after: [{ pendingSeconds: 130 }, { pendingSeconds: 130 }],
    });
    billing.settleBlock.mockResolvedValue({
      outcome: LiveSettleOutcome.DEFERRED,
      state: LiveSessionState.ACTIVE,
    });
    await manager.beat(row() as never, playing);
    expect(billing.settleBlock).toHaveBeenCalledTimes(1);
  });

  it('expires a due grace window', async () => {
    const { manager, billing } = setup({ after: [{ state: LiveSessionState.GRACE }] });
    const view = await manager.beat(row({ state: LiveSessionState.GRACE }) as never, playing);
    expect(billing.expireGraceIfDue).toHaveBeenCalled();
    expect(view.state).toBe(LiveSessionState.EXHAUSTED);
  });

  it('falls back to a liveness-only write when the state moved concurrently', async () => {
    const { manager, sessions, coverage } = setup();
    sessions.recordHeartbeat.mockResolvedValue(false);
    await manager.beat(row() as never, playing);
    expect(sessions.touch).toHaveBeenCalled();
    expect(coverage.record).not.toHaveBeenCalled();
  });

  it('ignores heartbeats of detached or player-only sessions', async () => {
    const { manager, presence } = setup();
    const view = await manager.beat(row({ state: LiveSessionState.DETACHED }) as never, playing);
    expect(view.state).toBe(LiveSessionState.DETACHED);
    await manager.beat(row({ state: LiveSessionState.UNSUPPORTED, runId: null }) as never, playing);
    expect(presence.touch).not.toHaveBeenCalled();
  });
});
