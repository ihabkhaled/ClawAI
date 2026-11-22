import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';

import type { LiveHlsPlayerHandle } from '@/types/live.types';
import { getAccessToken } from '@/utilities/api.utility';
import { attachHlsPlayer } from '@/utilities/hls.utility';

/** Attaches hls.js (loaded on demand) or native HLS to the video element; destroys it on unmount. */
export function useLivePlayerAttach(
  videoRef: RefObject<HTMLVideoElement | null>,
  src: string | null,
): { handleRef: RefObject<LiveHlsPlayerHandle | null>; hasError: boolean } {
  const handleRef = useRef<LiveHlsPlayerHandle | null>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (src === null || video === null) {
      return undefined;
    }
    let cancelled = false;
    attachHlsPlayer({ video, src, getToken: getAccessToken, onFatalError: () => setHasError(true) })
      .then((handle) => {
        if (cancelled) {
          handle.destroy();
          return;
        }
        handleRef.current = handle;
        // Autoplay can be refused; the native controls stay available, so this is not an error.
        video.play().catch(() => undefined);
      })
      .catch((error: unknown) => {
        console.warn('Live player could not start', error);
        setHasError(true);
      });
    return (): void => {
      cancelled = true;
      handleRef.current?.destroy();
      handleRef.current = null;
    };
  }, [src, videoRef]);

  return { handleRef, hasError };
}
