import { LiveCaptureAction, LiveCaptureError, LiveCaptureState } from '@/enums/live.enum';
import type { LiveCaptureEvent, LiveCaptureMachine } from '@/types/live.types';

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

/** Maps a thrown capture failure to its reason; a refused or cancelled picker is DENIED. */
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
