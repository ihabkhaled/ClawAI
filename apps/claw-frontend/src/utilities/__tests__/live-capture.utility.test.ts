import { afterEach, describe, expect, it, vi } from 'vitest';

import { LIVE_CAPTURE_DISPLAY_MEDIA_OPTIONS } from '@/constants/live.constants';
import { LiveCaptureError } from '@/enums/live.enum';
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
    await expect(startLiveTabCapture({ onChunk: vi.fn(), onEnded: vi.fn() })).rejects.toThrow(
      LiveCaptureError.UNSUPPORTED,
    );
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

    await expect(startLiveTabCapture({ onChunk: vi.fn(), onEnded: vi.fn() })).rejects.toThrow(
      LiveCaptureError.NO_AUDIO,
    );
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
