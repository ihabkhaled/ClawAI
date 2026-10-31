'use client';

import { useEffect } from 'react';

import { PRESENCE_HEARTBEAT_INTERVAL_MS } from '@/constants/admin-user-management.constants';
import { presenceRepository } from '@/repositories/presence/presence.repository';
import { useAuthStore } from '@/stores/auth.store';

/**
 * Tells the server the signed-in user is here, once a minute, while the tab is
 * visible. Starts with a ping when the tab becomes visible, stops when it is
 * hidden or the user signs out. A failed ping is ignored on purpose: presence is
 * a nicety and must never raise a toast, retry in a loop, or end a session.
 */
export function usePresenceHeartbeat(): void {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated || typeof document === 'undefined') {
      return undefined;
    }
    let timer: ReturnType<typeof setInterval> | null = null;

    const ping = (): void => {
      if (document.visibilityState === 'visible') {
        void presenceRepository.sendHeartbeat().catch(() => undefined);
      }
    };
    const stop = (): void => {
      if (timer !== null) {
        clearInterval(timer);
        timer = null;
      }
    };
    const start = (): void => {
      stop();
      ping();
      timer = setInterval(ping, PRESENCE_HEARTBEAT_INTERVAL_MS);
    };
    const onVisibilityChange = (): void => {
      if (document.visibilityState === 'visible') {
        start();
      } else {
        stop();
      }
    };

    if (document.visibilityState === 'visible') {
      start();
    }
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [isAuthenticated]);
}
