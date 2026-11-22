import { useMutation } from '@tanstack/react-query';
import { useEffect } from 'react';

import { liveRepository } from '@/repositories/live/live.repository';
import type { LiveSession } from '@/types/live.types';
import { sendLiveCloseBeacon } from '@/utilities/live-session.utility';

/**
 * Explicit close: `DELETE /sessions/:id` when the modal unmounts, and a `sendBeacon` with the close
 * token on `pagehide` (a normal request may never leave a closing tab). Without either, billing
 * would only stop when the server's 30 s heartbeat timeout fires.
 */
export function useLiveSessionClose(session: LiveSession | null): void {
  const { mutate: close } = useMutation({
    mutationFn: (id: string) => liveRepository.closeSession(id),
    onError: (error: Error) => console.warn('Live session close failed', error.message),
  });

  useEffect(() => {
    if (session === null) {
      return undefined;
    }
    const onPageHide = (): void => {
      sendLiveCloseBeacon(session);
    };
    window.addEventListener('pagehide', onPageHide);
    return (): void => {
      window.removeEventListener('pagehide', onPageHide);
      close(session.sessionId);
    };
  }, [close, session]);
}
