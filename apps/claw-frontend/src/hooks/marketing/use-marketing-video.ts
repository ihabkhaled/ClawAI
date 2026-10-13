import { useCallback, useEffect, useRef, useState } from 'react';

import type { UseMarketingVideoReturn } from '@/types/marketing-videos.types';

/**
 * State for a click-to-load self-hosted video. The mp4 is not requested until `activate` runs.
 * Once the player mounts it takes focus, because the button that held focus has just been replaced.
 */
export function useMarketingVideo(): UseMarketingVideoReturn {
  const [activated, setActivated] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const activate = useCallback((): void => {
    setActivated(true);
  }, []);

  useEffect(() => {
    if (activated) {
      videoRef.current?.focus();
    }
  }, [activated]);

  return { activated, activate, videoRef };
}
