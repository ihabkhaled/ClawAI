import * as React from 'react';

import { ScrollDirection } from '@/enums/scroll-direction.enum';
import type { UseScrollDirectionReturn } from '@/types/hook.types';

// Reports the user's most-recent vertical scroll direction. Returns `null`
// until the first scroll event, then resolves to `ScrollDirection.Up` /
// `ScrollDirection.Down`. Small jitter below `threshold` (defaults to 5px) is
// ignored so the value doesn't flicker when the user wiggles the trackpad.
//
// Uses rAF to throttle event handling. SSR-safe: returns `null` on the
// server, schedules nothing.
export function useScrollDirection(threshold = 5): UseScrollDirectionReturn {
  const [direction, setDirection] = React.useState<UseScrollDirectionReturn>(null);

  React.useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    let lastY = window.scrollY;
    let ticking = false;

    const update = (): void => {
      const currentY = window.scrollY;
      const delta = currentY - lastY;

      if (Math.abs(delta) >= threshold) {
        setDirection(delta > 0 ? ScrollDirection.Down : ScrollDirection.Up);
        lastY = currentY;
      }

      ticking = false;
    };

    const onScroll = (): void => {
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
    };
  }, [threshold]);

  return direction;
}
