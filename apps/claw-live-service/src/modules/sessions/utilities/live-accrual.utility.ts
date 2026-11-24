import { LiveHeartbeatState } from '../../../common/enums/live-heartbeat-state.enum';
import { LiveStatusCode } from '../../../common/enums/live-status-code.enum';
import { LiveRunStatus, LiveSessionState } from '../../../generated/prisma';
import {
  LIVE_ACCRUAL_CAP_MS,
  LIVE_ACCRUAL_REMAINDER_SLACK_MS,
  LIVE_DELAYED_TOLERANCE_MS,
  LIVE_HEARTBEAT_MAX_GAP_MS,
} from '../constants/live-session.constants';
import type {
  LiveAccrualInput,
  LiveAccrualResult,
  LiveRunAccrualView,
} from '../types/live-session.types';

/**
 * Whole seconds a PLAYING heartbeat accrues (architecture doc section 6).
 *
 * - First heartbeat, or a gap > 15 s since this session's previous one: 0.
 * - Starts from the (user, run) mark when it is at least this session's last
 *   heartbeat (minus the sub-second remainder): a second device on the same
 *   run then only adds wall time the first did not already count.
 * - Capped at 15 s; the sub-second remainder is kept in the mark, not lost.
 */
export function computeAccrual(input: LiveAccrualInput): LiveAccrualResult {
  const { now, lastHeartbeatAt, accruedUntil } = input;
  if (lastHeartbeatAt === null || now - lastHeartbeatAt > LIVE_HEARTBEAT_MAX_GAP_MS) {
    return { seconds: 0, nextAccruedUntil: null };
  }
  const from =
    accruedUntil !== null && accruedUntil >= lastHeartbeatAt - LIVE_ACCRUAL_REMAINDER_SLACK_MS
      ? accruedUntil
      : lastHeartbeatAt;
  if (now <= from) return { seconds: 0, nextAccruedUntil: null };
  const delta = now - from;
  if (delta > LIVE_ACCRUAL_CAP_MS) {
    return { seconds: Math.floor(LIVE_ACCRUAL_CAP_MS / 1000), nextAccruedUntil: now };
  }
  const seconds = Math.floor(delta / 1000);
  return { seconds, nextAccruedUntil: from + seconds * 1000 };
}

/** ACTIVE counts; DELAYED counts only while its last commit is ≤ 20 s old; nothing else does. */
export function isRunAccruing(
  run: Pick<LiveRunAccrualView, 'status' | 'lastCommitAt'> | null,
  now: number,
): boolean {
  if (!run) return false;
  if (run.status === LiveRunStatus.ACTIVE) return true;
  return run.status !== LiveRunStatus.DELAYED || run.lastCommitAt === null
    ? false
    : now - run.lastCommitAt.getTime() <= LIVE_DELAYED_TOLERANCE_MS;
}

/** The session state after a heartbeat: play/pause toggles only between the viewing states. */
export function nextStateForBeat(
  current: LiveSessionState,
  beat: LiveHeartbeatState,
): LiveSessionState {
  if (beat === LiveHeartbeatState.PAUSED) {
    const pausable: LiveSessionState[] = [
      LiveSessionState.CONNECTING,
      LiveSessionState.ACTIVE,
      LiveSessionState.GRACE,
    ];
    return pausable.includes(current) ? LiveSessionState.PAUSED : current;
  }
  const resumable: LiveSessionState[] = [LiveSessionState.CONNECTING, LiveSessionState.PAUSED];
  return resumable.includes(current) ? LiveSessionState.ACTIVE : current;
}

/** The status code a viewer is shown for a session state and its run. */
export function statusCodeFor(
  state: LiveSessionState,
  run: Pick<LiveRunAccrualView, 'status' | 'lastCommitAt'> | null,
): LiveStatusCode {
  if (state === LiveSessionState.ACTIVE) {
    if (run?.status === LiveRunStatus.ENDED) return LiveStatusCode.ENDED;
    return run?.status === LiveRunStatus.DELAYED
      ? LiveStatusCode.DELAYED
      : LiveStatusCode.ANALYZING;
  }
  const byState = new Map<LiveSessionState, LiveStatusCode>([
    [LiveSessionState.CONNECTING, LiveStatusCode.CONNECTING],
    [LiveSessionState.PAUSED, LiveStatusCode.PAUSED],
    [LiveSessionState.CREDITS_REQUIRED, LiveStatusCode.CREDITS_REQUIRED],
    [LiveSessionState.GRACE, LiveStatusCode.GRACE],
    [LiveSessionState.EXHAUSTED, LiveStatusCode.EXHAUSTED],
    [LiveSessionState.UNSUPPORTED, LiveStatusCode.UNSUPPORTED],
    [LiveSessionState.DETACHED, LiveStatusCode.COMPLETED],
  ]);
  return byState.get(state) ?? LiveStatusCode.CONNECTING;
}
