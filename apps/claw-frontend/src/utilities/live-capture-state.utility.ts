import { LIVE_CAPTURE_COPY } from '@/constants/live.constants';
import {
  LiveCaptureAction,
  LiveCaptureError,
  LiveCaptureSource,
  LiveCaptureState,
} from '@/enums/live.enum';
import type { LiveCaptureCopy, LiveCaptureEvent, LiveCaptureMachine } from '@/types/live.types';

/**
 * The capture state machine. Allowed moves:
 * idle | stopped | error --REQUEST--> requesting --STARTED--> capturing --STOP--> stopped;
 * requesting | capturing --FAIL--> error; any --RESET--> idle. Every other event is ignored, so a
 * late "track ended" after a stop cannot resurrect or re-stop anything.
 */
export function liveCaptureReducer(
  machine: LiveCaptureMachine,
  event: LiveCaptureEvent,
): LiveCaptureMachine {
  const { state } = machine;
  switch (event.type) {
    case LiveCaptureAction.REQUEST:
      return state === LiveCaptureState.REQUESTING || state === LiveCaptureState.CAPTURING
        ? machine
        : { state: LiveCaptureState.REQUESTING, error: null };
    case LiveCaptureAction.STARTED:
      return state === LiveCaptureState.REQUESTING
        ? { state: LiveCaptureState.CAPTURING, error: null }
        : machine;
    case LiveCaptureAction.STOP:
      return state === LiveCaptureState.CAPTURING || state === LiveCaptureState.REQUESTING
        ? { state: LiveCaptureState.STOPPED, error: null }
        : machine;
    case LiveCaptureAction.FAIL:
      return state === LiveCaptureState.CAPTURING || state === LiveCaptureState.REQUESTING
        ? { state: LiveCaptureState.ERROR, error: event.error }
        : machine;
    case LiveCaptureAction.RESET:
      return { state: LiveCaptureState.IDLE, error: null };
    default:
      return machine;
  }
}

/** Maps a thrown capture failure to its reason; a refused picker or microphone prompt is DENIED. */
export function toLiveCaptureError(error: unknown): LiveCaptureError {
  if (error instanceof Error) {
    const known = Object.values(LiveCaptureError).find((code) => code === error.message);
    if (known !== undefined) {
      return known;
    }
    if (error.name === 'NotAllowedError' || error.name === 'AbortError') {
      return LiveCaptureError.DENIED;
    }
  }
  return LiveCaptureError.UNSUPPORTED;
}

/** Whether this browser can share tab audio into an AudioWorklet at all (no mobile browser can). */
export function isLiveCaptureSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    typeof navigator.mediaDevices?.getDisplayMedia === 'function' &&
    typeof AudioWorkletNode !== 'undefined'
  );
}

/** Whether this browser can feed its microphone into an AudioWorklet (every current mobile browser can). */
export function isLiveMicCaptureSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    typeof navigator.mediaDevices?.getUserMedia === 'function' &&
    typeof AudioWorkletNode !== 'undefined'
  );
}

/** Tab audio when the browser can share it, else the microphone, else null (nothing can be captured). */
export function pickLiveCaptureSource(): LiveCaptureSource | null {
  if (isLiveCaptureSupported()) {
    return LiveCaptureSource.TAB;
  }
  return isLiveMicCaptureSupported() ? LiveCaptureSource.MICROPHONE : null;
}

/** The panel and consent copy for a source; with no source the tab copy stays (its error explains). */
export function liveCaptureCopy(source: LiveCaptureSource | null): LiveCaptureCopy {
  return LIVE_CAPTURE_COPY[source ?? LiveCaptureSource.TAB];
}

/**
 * The state-machine event for a failed start. A cancelled tab picker returns to idle in silence
 * (declining to share is a decision); a refused microphone fails MIC_DENIED, because a blocked
 * permission keeps failing until the viewer allows it in the site settings.
 */
export function toLiveCaptureFailureEvent(
  error: unknown,
  source: LiveCaptureSource,
): LiveCaptureEvent {
  const reason = toLiveCaptureError(error);
  if (reason !== LiveCaptureError.DENIED) {
    return { type: LiveCaptureAction.FAIL, error: reason };
  }
  return source === LiveCaptureSource.MICROPHONE
    ? { type: LiveCaptureAction.FAIL, error: LiveCaptureError.MIC_DENIED }
    : { type: LiveCaptureAction.RESET };
}

/** Capture support never changes while the page is open, so there is nothing to subscribe to. */
export function subscribeLiveCaptureSource(): () => void {
  return () => undefined;
}

/** The server cannot know the device: it renders the tab wording (null source). */
export function liveCaptureSourceServerSnapshot(): LiveCaptureSource | null {
  return null;
}
