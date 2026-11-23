import { useCallback, useEffect, useRef, useState } from 'react';

import { LIVE_CAPTURE_STOP_STATUSES } from '@/constants/live.constants';
import { LiveCaptureError, LiveCaptureState } from '@/enums/live.enum';
import { useLiveCaptureControl } from '@/hooks/live/use-live-capture-control';
import { useLiveCaptureUpload } from '@/hooks/live/use-live-capture-upload';
import type { UseLiveCaptureOptions, UseLiveCaptureResult } from '@/types/live.types';
import { pickLiveCaptureSource } from '@/utilities/live-capture-state.utility';

/**
 * "Analyze with my browser": consent first, then the capture. The source is this tab's audio where
 * the browser can share it, else the microphone (phones), else none (UNSUPPORTED on confirm).
 * Stops on track end, on modal close (unmount) and on a status that ends analysis (EXHAUSTED,
 * CREDITS_REQUIRED, ...).
 */
export function useLiveCapture({
  sessionId,
  enabled,
  status,
}: UseLiveCaptureOptions): UseLiveCaptureResult {
  const [consentOpen, setConsentOpen] = useState(false);
  // The modal only mounts after a click, never during server rendering, so reading navigator is safe.
  const [source] = useState(pickLiveCaptureSource);
  // The upload hook needs `fail` before the control hook that owns it exists: bridge with a ref.
  const failRef = useRef<(error: LiveCaptureError) => void>(() => undefined);
  const onFatal = useCallback((): void => failRef.current(LiveCaptureError.UPLOAD), []);
  const upload = useLiveCaptureUpload(sessionId, onFatal);
  const { machine, start, stop, fail } = useLiveCaptureControl(upload);
  const isCapturing = machine.state === LiveCaptureState.CAPTURING;

  useEffect(() => {
    failRef.current = fail;
  }, [fail]);
  useEffect(() => {
    if (LIVE_CAPTURE_STOP_STATUSES.has(status) && isCapturing) {
      stop();
    }
  }, [isCapturing, status, stop]);

  return {
    source,
    state: machine.state,
    error: machine.error,
    isCapturing,
    consentOpen,
    openConsent: () => setConsentOpen(enabled),
    closeConsent: () => setConsentOpen(false),
    confirm: () => {
      setConsentOpen(false);
      if (enabled && sessionId !== null) {
        start(source);
      }
    },
    stop,
  };
}
