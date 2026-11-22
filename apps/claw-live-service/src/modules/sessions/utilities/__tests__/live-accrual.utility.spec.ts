import { LiveHeartbeatState } from '../../../../common/enums/live-heartbeat-state.enum';
import { LiveStatusCode } from '../../../../common/enums/live-status-code.enum';
import { LiveRunStatus, LiveSessionState } from '../../../../generated/prisma';
import {
  computeAccrual,
  isRunAccruing,
  nextStateForBeat,
  statusCodeFor,
} from '../live-accrual.utility';

const T = 1_800_000_000_000;

describe('computeAccrual', () => {
  it('accrues the wall time since the previous heartbeat', () => {
    expect(computeAccrual({ now: T + 10_000, lastHeartbeatAt: T, accruedUntil: null })).toEqual({
      seconds: 10,
      nextAccruedUntil: T + 10_000,
    });
  });

  it('accrues nothing on the first heartbeat', () => {
    expect(computeAccrual({ now: T, lastHeartbeatAt: null, accruedUntil: null }).seconds).toBe(0);
  });

  it('accrues nothing after a gap longer than 15 s', () => {
    expect(computeAccrual({ now: T + 15_001, lastHeartbeatAt: T, accruedUntil: T }).seconds).toBe(
      0,
    );
  });

  it('caps one heartbeat at 15 s', () => {
    expect(
      computeAccrual({ now: T + 15_000, lastHeartbeatAt: T, accruedUntil: T - 20_000 }),
    ).toEqual({
      seconds: 15,
      nextAccruedUntil: T + 15_000,
    });
  });

  it('keeps the sub-second remainder in the mark instead of losing it', () => {
    const first = computeAccrual({ now: T + 10_500, lastHeartbeatAt: T, accruedUntil: T });
    expect(first).toEqual({ seconds: 10, nextAccruedUntil: T + 10_000 });
    const second = computeAccrual({
      now: T + 21_000,
      lastHeartbeatAt: T + 10_500,
      accruedUntil: first.nextAccruedUntil,
    });
    expect(second).toEqual({ seconds: 11, nextAccruedUntil: T + 21_000 });
  });

  it('never double-counts two devices on the same run', () => {
    // Device A beats at 0, 10, 20; device B at 5, 15, 25. Wall time 0..25 = 25 s.
    let mark: number | null = null;
    let total = 0;
    const beats: Array<[number, number | null]> = [
      [T, null],
      [T + 5000, null],
      [T + 10_000, T],
      [T + 15_000, T + 5000],
      [T + 20_000, T + 10_000],
      [T + 25_000, T + 15_000],
    ];
    for (const [now, last] of beats) {
      const result = computeAccrual({ now, lastHeartbeatAt: last, accruedUntil: mark });
      total += result.seconds;
      if (result.nextAccruedUntil !== null) mark = result.nextAccruedUntil;
    }
    expect(total).toBeLessThanOrEqual(25);
    expect(total).toBe(25);
  });

  it('accrues nothing when the mark is already at or past now', () => {
    expect(
      computeAccrual({ now: T + 10_000, lastHeartbeatAt: T, accruedUntil: T + 10_000 }).seconds,
    ).toBe(0);
  });
});

describe('isRunAccruing', () => {
  const now = T;
  it('counts ACTIVE runs', () => {
    expect(isRunAccruing({ status: LiveRunStatus.ACTIVE, lastCommitAt: null }, now)).toBe(true);
  });
  it('counts a DELAYED run only while its last commit is at most 20 s old', () => {
    expect(
      isRunAccruing({ status: LiveRunStatus.DELAYED, lastCommitAt: new Date(now - 20_000) }, now),
    ).toBe(true);
    expect(
      isRunAccruing({ status: LiveRunStatus.DELAYED, lastCommitAt: new Date(now - 20_001) }, now),
    ).toBe(false);
    expect(isRunAccruing({ status: LiveRunStatus.DELAYED, lastCommitAt: null }, now)).toBe(false);
  });
  it('never counts other states or a missing run', () => {
    expect(isRunAccruing({ status: LiveRunStatus.PENDING, lastCommitAt: null }, now)).toBe(false);
    expect(
      isRunAccruing({ status: LiveRunStatus.STOPPING, lastCommitAt: new Date(now) }, now),
    ).toBe(false);
    expect(isRunAccruing(null, now)).toBe(false);
  });
});

describe('nextStateForBeat', () => {
  it('pauses only the viewing states', () => {
    expect(nextStateForBeat(LiveSessionState.ACTIVE, LiveHeartbeatState.PAUSED)).toBe(
      LiveSessionState.PAUSED,
    );
    expect(nextStateForBeat(LiveSessionState.GRACE, LiveHeartbeatState.PAUSED)).toBe(
      LiveSessionState.PAUSED,
    );
    expect(nextStateForBeat(LiveSessionState.EXHAUSTED, LiveHeartbeatState.PAUSED)).toBe(
      LiveSessionState.EXHAUSTED,
    );
  });
  it('resumes PAUSED/CONNECTING to ACTIVE and leaves billing states alone', () => {
    expect(nextStateForBeat(LiveSessionState.PAUSED, LiveHeartbeatState.PLAYING)).toBe(
      LiveSessionState.ACTIVE,
    );
    expect(nextStateForBeat(LiveSessionState.CONNECTING, LiveHeartbeatState.PLAYING)).toBe(
      LiveSessionState.ACTIVE,
    );
    expect(nextStateForBeat(LiveSessionState.CREDITS_REQUIRED, LiveHeartbeatState.PLAYING)).toBe(
      LiveSessionState.CREDITS_REQUIRED,
    );
  });
});

describe('statusCodeFor', () => {
  it('maps states and run status to viewer status codes', () => {
    expect(
      statusCodeFor(LiveSessionState.ACTIVE, { status: LiveRunStatus.ACTIVE, lastCommitAt: null }),
    ).toBe(LiveStatusCode.ANALYZING);
    expect(
      statusCodeFor(LiveSessionState.ACTIVE, { status: LiveRunStatus.DELAYED, lastCommitAt: null }),
    ).toBe(LiveStatusCode.DELAYED);
    expect(
      statusCodeFor(LiveSessionState.ACTIVE, { status: LiveRunStatus.ENDED, lastCommitAt: null }),
    ).toBe(LiveStatusCode.ENDED);
    expect(statusCodeFor(LiveSessionState.GRACE, null)).toBe(LiveStatusCode.GRACE);
    expect(statusCodeFor(LiveSessionState.DETACHED, null)).toBe(LiveStatusCode.COMPLETED);
  });
});
