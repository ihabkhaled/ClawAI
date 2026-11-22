import { LiveCoverageAction } from '../../../../common/enums/live-coverage-action.enum';
import { decideCoverage, endsInGap } from '../live-coverage.utility';

const T = 1_800_000_000_000;

describe('decideCoverage', () => {
  it('opens the first interval', () => {
    expect(decideCoverage({ latestToAt: null, playbackAt: T, elapsedMs: 0 })).toBe(
      LiveCoverageAction.OPEN,
    );
  });

  it('extends while playback advances with wall time', () => {
    expect(decideCoverage({ latestToAt: T, playbackAt: T + 10_000, elapsedMs: 10_000 })).toBe(
      LiveCoverageAction.EXTEND,
    );
  });

  it('extends a DVR resume that continues from the paused point', () => {
    expect(decideCoverage({ latestToAt: T, playbackAt: T + 9000, elapsedMs: 10_000 })).toBe(
      LiveCoverageAction.EXTEND,
    );
  });

  it('opens on a jump forward (Live Edge return) or a seek back', () => {
    expect(decideCoverage({ latestToAt: T, playbackAt: T + 300_000, elapsedMs: 10_000 })).toBe(
      LiveCoverageAction.OPEN,
    );
    expect(decideCoverage({ latestToAt: T, playbackAt: T - 60_000, elapsedMs: 10_000 })).toBe(
      LiveCoverageAction.OPEN,
    );
  });
});

describe('endsInGap', () => {
  it('is a gap only when back at the Live Edge after the paused point left the DVR window', () => {
    expect(endsInGap({ atLiveEdge: true, seekableFromAt: T, lastPlaybackAt: T - 1 })).toBe(true);
    expect(endsInGap({ atLiveEdge: true, seekableFromAt: T, lastPlaybackAt: T + 1 })).toBe(false);
    expect(endsInGap({ atLiveEdge: false, seekableFromAt: T, lastPlaybackAt: T - 1 })).toBe(false);
    expect(endsInGap({ atLiveEdge: true, seekableFromAt: undefined, lastPlaybackAt: T - 1 })).toBe(
      false,
    );
    expect(endsInGap({ atLiveEdge: true, seekableFromAt: T, lastPlaybackAt: null })).toBe(false);
  });
});
