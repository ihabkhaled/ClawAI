import { LiveCoverageAction } from '../../../common/enums/live-coverage-action.enum';
import { LIVE_COVERAGE_TOLERANCE_MS } from '../constants/live-session.constants';
import type { LiveCoverageInput, LiveGapInput } from '../types/live-session.types';

/**
 * Continuous playback extends the current interval: media time moved forward
 * by no more than the wall time since the last heartbeat (plus slack). Anything
 * else — a seek back, a jump to the Live Edge — opens a new interval.
 * A resume from a DVR pause continues from the paused point, so it extends.
 */
export function decideCoverage(input: LiveCoverageInput): LiveCoverageAction {
  if (input.latestToAt === null) return LiveCoverageAction.OPEN;
  const advance = input.playbackAt - input.latestToAt;
  const continuous =
    advance >= -LIVE_COVERAGE_TOLERANCE_MS &&
    advance <= Math.max(0, input.elapsedMs) + LIVE_COVERAGE_TOLERANCE_MS;
  return continuous ? LiveCoverageAction.EXTEND : LiveCoverageAction.OPEN;
}

/**
 * The closed interval ends in a visible GAP when the viewer returned to the Live
 * Edge because the paused point fell out of the seekable (DVR) window.
 */
export function endsInGap(input: LiveGapInput): boolean {
  return (
    input.atLiveEdge &&
    input.seekableFromAt !== undefined &&
    input.lastPlaybackAt !== null &&
    input.lastPlaybackAt < input.seekableFromAt
  );
}
