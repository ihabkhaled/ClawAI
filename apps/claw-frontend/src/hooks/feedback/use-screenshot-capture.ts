import { useCallback, useState } from 'react';

import { SCREEN_CAPTURE_ERROR_KEYS } from '@/constants/feedback.constants';
import type { UseScreenshotCaptureReturn } from '@/types/feedback-hook.types';
import { captureDisplayFrame, isScreenCaptureSupported } from '@/utilities/screen-capture.utility';

export function useScreenshotCapture(): UseScreenshotCaptureReturn {
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const capture = useCallback(async () => {
    setIsCapturing(true);
    setError(null);
    try {
      const result = await captureDisplayFrame();
      // A cancelled retry must not throw away the shot already taken.
      if (result.dataUrl !== null) {
        setScreenshot(result.dataUrl);
      }
      setError(SCREEN_CAPTURE_ERROR_KEYS[result.status]);
    } finally {
      setIsCapturing(false);
    }
  }, []);

  const clear = useCallback(() => {
    setScreenshot(null);
    setError(null);
  }, []);

  return {
    capture,
    screenshot,
    clear,
    isCapturing,
    error,
    isSupported: isScreenCaptureSupported(),
  };
}
