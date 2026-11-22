import { useEffect, useState } from 'react';

import { LIVE_WALL_CLOCK_TICK_MS } from '@/constants/live.constants';

/**
 * Wall-clock time, re-read every second while enabled (0 otherwise). A capture session reveals the
 * feed at `playbackAt = Date.now()`: a cross-origin player exposes no media time to read.
 */
export function useLiveWallClock(enabled: boolean): number {
  const [now, setNow] = useState(0);

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), LIVE_WALL_CLOCK_TICK_MS);
    return (): void => clearInterval(timer);
  }, [enabled]);

  return enabled ? now : 0;
}
