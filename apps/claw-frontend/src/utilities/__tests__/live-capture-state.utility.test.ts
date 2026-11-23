import { afterEach, describe, expect, it, vi } from 'vitest';

import { LIVE_CAPTURE_COPY, LIVE_CAPTURE_IDLE } from '@/constants/live.constants';
import {
  LiveCaptureAction,
  LiveCaptureError,
  LiveCaptureSource,
  LiveCaptureState,
} from '@/enums/live.enum';
import type { LiveCaptureMachine } from '@/types/live.types';
import {
  isLiveMicCaptureSupported,
  liveCaptureCopy,
  liveCaptureReducer,
  pickLiveCaptureSource,
  toLiveCaptureError,
  toLiveCaptureFailureEvent,
} from '@/utilities/live-capture-state.utility';

const at = (state: LiveCaptureState): LiveCaptureMachine => ({ state, error: null });

describe('liveCaptureReducer', () => {
  it('walks idle → requesting → capturing → stopped', () => {
    let machine = liveCaptureReducer(LIVE_CAPTURE_IDLE, { type: LiveCaptureAction.REQUEST });
    expect(machine.state).toBe(LiveCaptureState.REQUESTING);
    machine = liveCaptureReducer(machine, { type: LiveCaptureAction.STARTED });
    expect(machine.state).toBe(LiveCaptureState.CAPTURING);
    machine = liveCaptureReducer(machine, { type: LiveCaptureAction.STOP });
    expect(machine).toEqual({ state: LiveCaptureState.STOPPED, error: null });
  });

  it('fails from requesting or capturing with the reason', () => {
    for (const state of [LiveCaptureState.REQUESTING, LiveCaptureState.CAPTURING]) {
      expect(
        liveCaptureReducer(at(state), {
          type: LiveCaptureAction.FAIL,
          error: LiveCaptureError.NO_AUDIO,
        }),
      ).toEqual({ state: LiveCaptureState.ERROR, error: LiveCaptureError.NO_AUDIO });
    }
  });

  it('ignores moves that are not allowed', () => {
    const idle = LIVE_CAPTURE_IDLE;
    expect(liveCaptureReducer(idle, { type: LiveCaptureAction.STARTED })).toBe(idle);
    expect(liveCaptureReducer(idle, { type: LiveCaptureAction.STOP })).toBe(idle);
    const stopped = at(LiveCaptureState.STOPPED);
    expect(
      liveCaptureReducer(stopped, { type: LiveCaptureAction.FAIL, error: LiveCaptureError.UPLOAD }),
    ).toBe(stopped);
    const capturing = at(LiveCaptureState.CAPTURING);
    expect(liveCaptureReducer(capturing, { type: LiveCaptureAction.REQUEST })).toBe(capturing);
  });

  it('can start again after a stop or an error, clearing the error', () => {
    const failed: LiveCaptureMachine = {
      state: LiveCaptureState.ERROR,
      error: LiveCaptureError.UPLOAD,
    };
    expect(liveCaptureReducer(failed, { type: LiveCaptureAction.REQUEST })).toEqual({
      state: LiveCaptureState.REQUESTING,
      error: null,
    });
    expect(liveCaptureReducer(failed, { type: LiveCaptureAction.RESET })).toEqual(
      LIVE_CAPTURE_IDLE,
    );
  });
});

describe('toLiveCaptureError', () => {
  it('maps our own reasons, a refused picker, and anything else', () => {
    expect(toLiveCaptureError(new Error(LiveCaptureError.NO_AUDIO))).toBe(
      LiveCaptureError.NO_AUDIO,
    );
    const denied = Object.assign(new Error('Permission denied'), { name: 'NotAllowedError' });
    expect(toLiveCaptureError(denied)).toBe(LiveCaptureError.DENIED);
    expect(toLiveCaptureError(new Error('boom'))).toBe(LiveCaptureError.UNSUPPORTED);
    expect(toLiveCaptureError('weird')).toBe(LiveCaptureError.UNSUPPORTED);
  });
});

describe('pickLiveCaptureSource', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('picks tab audio when the browser can share it', () => {
    vi.stubGlobal('navigator', {
      mediaDevices: { getDisplayMedia: vi.fn(), getUserMedia: vi.fn() },
    });
    vi.stubGlobal('AudioWorkletNode', class {});
    expect(pickLiveCaptureSource()).toBe(LiveCaptureSource.TAB);
  });

  it('falls back to the microphone on a phone (no getDisplayMedia)', () => {
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: vi.fn() } });
    vi.stubGlobal('AudioWorkletNode', class {});
    expect(isLiveMicCaptureSupported()).toBe(true);
    expect(pickLiveCaptureSource()).toBe(LiveCaptureSource.MICROPHONE);
  });

  it('returns null when neither works (no media devices, or no AudioWorklet)', () => {
    vi.stubGlobal('navigator', {});
    vi.stubGlobal('AudioWorkletNode', class {});
    expect(pickLiveCaptureSource()).toBeNull();
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: vi.fn() } });
    vi.stubGlobal('AudioWorkletNode', undefined);
    expect(isLiveMicCaptureSupported()).toBe(false);
    expect(pickLiveCaptureSource()).toBeNull();
  });
});

describe('liveCaptureCopy', () => {
  it('uses the microphone wording for MICROPHONE and the tab wording otherwise', () => {
    expect(liveCaptureCopy(LiveCaptureSource.MICROPHONE).analyzeKey).toBe(
      'live.capture.analyzeMic',
    );
    expect(liveCaptureCopy(LiveCaptureSource.TAB)).toBe(LIVE_CAPTURE_COPY[LiveCaptureSource.TAB]);
    expect(liveCaptureCopy(null)).toBe(LIVE_CAPTURE_COPY[LiveCaptureSource.TAB]);
  });
});

describe('toLiveCaptureFailureEvent', () => {
  const refused = Object.assign(new Error('x'), { name: 'NotAllowedError' });

  it('resets in silence when the tab picker is cancelled', () => {
    expect(toLiveCaptureFailureEvent(refused, LiveCaptureSource.TAB)).toEqual({
      type: LiveCaptureAction.RESET,
    });
  });

  it('fails MIC_DENIED when the microphone is refused', () => {
    expect(toLiveCaptureFailureEvent(refused, LiveCaptureSource.MICROPHONE)).toEqual({
      type: LiveCaptureAction.FAIL,
      error: LiveCaptureError.MIC_DENIED,
    });
  });

  it('fails with the reason for anything else, on either source', () => {
    const noAudio = new Error(LiveCaptureError.NO_AUDIO);
    for (const source of [LiveCaptureSource.TAB, LiveCaptureSource.MICROPHONE]) {
      expect(toLiveCaptureFailureEvent(noAudio, source)).toEqual({
        type: LiveCaptureAction.FAIL,
        error: LiveCaptureError.NO_AUDIO,
      });
    }
  });
});
