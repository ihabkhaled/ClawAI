'use client';

import { useEffect, useState } from 'react';

import { THIRD_PARTY_IDLE_TIMEOUT_MS } from '@/constants/third-party-defer.constants';

/**
 * False until the browser has an idle moment, then true forever.
 *
 * For third-party tags that must still load — analytics, ads — but must not
 * compete with hydration for the main thread. On mobile that competition was
 * the measured 500ms of Total Blocking Time; nothing here removes a feature,
 * it only moves it behind the work the user is actually waiting for.
 *
 * `requestIdleCallback` is absent on Safari, so a timeout is the floor rather
 * than the fallback: whichever fires first wins, and the tag always loads.
 */
export function useIdleDeferred(): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let done = false;
    const markReady = (): void => {
      if (!done) {
        done = true;
        setReady(true);
      }
    };
    const timer = globalThis.setTimeout(markReady, THIRD_PARTY_IDLE_TIMEOUT_MS);
    const idleHandle =
      typeof globalThis.requestIdleCallback === 'function'
        ? globalThis.requestIdleCallback(markReady, { timeout: THIRD_PARTY_IDLE_TIMEOUT_MS })
        : null;
    return () => {
      globalThis.clearTimeout(timer);
      if (idleHandle !== null && typeof globalThis.cancelIdleCallback === 'function') {
        globalThis.cancelIdleCallback(idleHandle);
      }
    };
  }, []);

  return ready;
}
