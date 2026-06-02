import * as React from 'react';

import { REDUCED_MOTION_QUERY } from '@/constants/media-query.constants';
import { useIsomorphicLayoutEffect } from '@/hooks/common/use-isomorphic-layout-effect';

// SSR-safe `window.matchMedia` wrapper. On the server (no window) it always
// resolves to `false`, so consumers can treat the return as the *current*
// match state without guarding for hydration. The MediaQueryList listener is
// registered with the modern `addEventListener('change', …)` API and falls
// back to the legacy `addListener` shape for older Safari versions.
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = React.useState<boolean>(false);

  useIsomorphicLayoutEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const mql = window.matchMedia(query);
    setMatches(mql.matches);

    const handler = (event: MediaQueryListEvent): void => {
      setMatches(event.matches);
    };

    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', handler);
      return () => {
        mql.removeEventListener('change', handler);
      };
    }

    // Legacy Safari ≤ 13 fallback. `addListener` is deprecated but still
    // present; the cleanup mirrors it.
    mql.addListener(handler);
    return () => {
      mql.removeListener(handler);
    };
  }, [query]);

  return matches;
}

// True when the user has asked the OS to minimise non-essential motion.
// JS-side companion to the global `@media (prefers-reduced-motion)` CSS guard —
// lets motion-driving hooks (stagger, page transition, gestures) skip work
// entirely rather than relying on the animation being CSS-cancelled.
export function useReducedMotion(): boolean {
  return useMediaQuery(REDUCED_MOTION_QUERY);
}
