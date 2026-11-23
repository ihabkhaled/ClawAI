import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  LIVE_CAPTURE_DISPLAY_MEDIA_OPTIONS,
  LIVE_CAPTURE_MIC_CONSTRAINTS,
} from '@/constants/live.constants';
import { LiveCaptureError, LiveCaptureSource } from '@/enums/live.enum';
import { startLiveTabCapture } from '@/utilities/live-capture.utility';

function track(kind: string): { kind: string; stop: ReturnType<typeof vi.fn> } {
  return { kind, stop: vi.fn() };
}

describe('startLiveTabCapture', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('refuses a browser without getDisplayMedia or AudioWorklet', async () => {
    vi.stubGlobal('navigator', {});
    await expect(
      startLiveTabCapture({ source: LiveCaptureSource.TAB, onChunk: vi.fn(), onEnded: vi.fn() }),
    ).rejects.toThrow(LiveCaptureError.UNSUPPORTED);
  });

  it('asks for this tab with raw audio, stops the video, and fails with NO_AUDIO without an audio track', async () => {
    const video = track('video');
    const getDisplayMedia = vi.fn().mockResolvedValue({
      getVideoTracks: () => [video],
      getAudioTracks: () => [],
      getTracks: () => [video],
    });
    vi.stubGlobal('navigator', { mediaDevices: { getDisplayMedia } });
    vi.stubGlobal('AudioWorkletNode', class {});

    await expect(
      startLiveTabCapture({ source: LiveCaptureSource.TAB, onChunk: vi.fn(), onEnded: vi.fn() }),
    ).rejects.toThrow(LiveCaptureError.NO_AUDIO);
    expect(getDisplayMedia).toHaveBeenCalledWith(LIVE_CAPTURE_DISPLAY_MEDIA_OPTIONS);
    expect(LIVE_CAPTURE_DISPLAY_MEDIA_OPTIONS).toMatchObject({
      video: true,
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      preferCurrentTab: true,
      selfBrowserSurface: 'include',
      systemAudio: 'include',
    });
    expect(video.stop).toHaveBeenCalled();
  });
});

describe('startLiveTabCapture with the microphone', () => {
  const mic = { source: LiveCaptureSource.MICROPHONE, onChunk: vi.fn(), onEnded: vi.fn() };

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('refuses a browser without getUserMedia', async () => {
    vi.stubGlobal('navigator', { mediaDevices: { getDisplayMedia: vi.fn() } });
    vi.stubGlobal('AudioWorkletNode', class {});
    await expect(startLiveTabCapture(mic)).rejects.toThrow(LiveCaptureError.UNSUPPORTED);
  });

  it('asks for raw microphone audio with echo cancellation off, never the tab picker', async () => {
    const getUserMedia = vi.fn().mockResolvedValue({
      getAudioTracks: () => [],
      getTracks: () => [],
    });
    const getDisplayMedia = vi.fn();
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia, getDisplayMedia } });
    vi.stubGlobal('AudioWorkletNode', class {});

    await expect(startLiveTabCapture(mic)).rejects.toThrow(LiveCaptureError.NO_AUDIO);
    expect(getUserMedia).toHaveBeenCalledWith(LIVE_CAPTURE_MIC_CONSTRAINTS);
    expect(LIVE_CAPTURE_MIC_CONSTRAINTS).toEqual({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    });
    expect(getDisplayMedia).not.toHaveBeenCalled();
  });

  it('passes a refused microphone through as NotAllowedError (the hook maps it to DENIED)', async () => {
    const refused = Object.assign(new Error('denied'), { name: 'NotAllowedError' });
    vi.stubGlobal('navigator', {
      mediaDevices: { getUserMedia: vi.fn().mockRejectedValue(refused) },
    });
    vi.stubGlobal('AudioWorkletNode', class {});
    await expect(startLiveTabCapture(mic)).rejects.toBe(refused);
  });
});
