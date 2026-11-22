import { useCallback, useEffect, useReducer, useRef } from 'react';

import { LIVE_CAPTURE_IDLE } from '@/constants/live.constants';
import { LiveCaptureAction, LiveCaptureError } from '@/enums/live.enum';
import type {
  LiveAudioChunkInput,
  LiveCaptureMachine,
  LiveTabCaptureHandle,
} from '@/types/live.types';
import { liveCaptureReducer, toLiveCaptureError } from '@/utilities/live-capture-state.utility';

/**
 * Owns the capture handle and its state machine. The pipeline module is imported on demand, only
 * when `start` runs. Unmount (modal close) stops the capture. A cancelled picker returns to idle in
 * silence: declining to share is a decision, not an error.
 */
export function useLiveCaptureControl(onChunk: (chunk: LiveAudioChunkInput) => void): {
  machine: LiveCaptureMachine;
  start: () => void;
  stop: () => void;
  fail: (error: LiveCaptureError) => void;
} {
  const [machine, dispatch] = useReducer(liveCaptureReducer, LIVE_CAPTURE_IDLE);
  const handleRef = useRef<LiveTabCaptureHandle | null>(null);
  const chunkRef = useRef(onChunk);
  // Bumped on every start, stop and unmount: a picker answer that arrives late is discarded.
  const attemptRef = useRef(0);

  useEffect(() => {
    chunkRef.current = onChunk;
  }, [onChunk]);
  const release = useCallback((): void => {
    attemptRef.current += 1;
    handleRef.current?.stop();
    handleRef.current = null;
  }, []);
  const stop = useCallback((): void => {
    release();
    dispatch({ type: LiveCaptureAction.STOP });
  }, [release]);
  const fail = useCallback(
    (error: LiveCaptureError): void => {
      release();
      dispatch({ type: LiveCaptureAction.FAIL, error });
    },
    [release],
  );
  const start = useCallback((): void => {
    attemptRef.current += 1;
    const attempt = attemptRef.current;
    dispatch({ type: LiveCaptureAction.REQUEST });
    import('@/utilities/live-capture.utility')
      .then(({ startLiveTabCapture }) =>
        startLiveTabCapture({ onChunk: (chunk) => chunkRef.current(chunk), onEnded: stop }),
      )
      .then((handle) => {
        if (attempt !== attemptRef.current) {
          handle.stop();
          return;
        }
        handleRef.current = handle;
        dispatch({ type: LiveCaptureAction.STARTED });
      })
      .catch((error: unknown) => {
        if (attempt !== attemptRef.current) {
          return;
        }
        const reason = toLiveCaptureError(error);
        dispatch(
          reason === LiveCaptureError.DENIED
            ? { type: LiveCaptureAction.RESET }
            : { type: LiveCaptureAction.FAIL, error: reason },
        );
      });
  }, [stop]);
  useEffect(() => release, [release]);

  return { machine, start, stop, fail };
}
