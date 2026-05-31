import { useEffect, useLayoutEffect } from 'react';

// SSR-safe layout effect. useLayoutEffect would warn during the
// server-render pass (no DOM yet), so resolve to useEffect when there is no
// window and useLayoutEffect in the browser. Both share an identical
// signature, so the resolved binding always satisfies the rules-of-hooks.
//
// Returned as a named export — direct callers MUST import and call it
// instead of branching `typeof window` at every site.
export const useIsomorphicLayoutEffect =
  typeof window === 'undefined' ? useEffect : useLayoutEffect;
