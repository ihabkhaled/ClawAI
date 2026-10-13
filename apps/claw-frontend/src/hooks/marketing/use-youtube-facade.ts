import { useCallback, useEffect, useRef, useState } from 'react';

import type { UseYouTubeFacadeReturn } from '@/types/marketing-videos.types';

/**
 * State for a click-to-load YouTube embed. Nothing is requested from YouTube until `activate` runs.
 * Once the frame mounts it takes focus, because the button that held focus has just been replaced.
 */
export function useYouTubeFacade(): UseYouTubeFacadeReturn {
  const [activated, setActivated] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const activate = useCallback((): void => {
    setActivated(true);
  }, []);

  useEffect(() => {
    if (activated) {
      iframeRef.current?.focus();
    }
  }, [activated]);

  return { activated, activate, iframeRef };
}
