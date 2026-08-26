import { afterEach, describe, expect, it, vi } from 'vitest';

import { ScreenCaptureStatus } from '@/enums';
import { captureDisplayFrame, isScreenCaptureSupported } from '@/utilities/screen-capture.utility';

const stopTrack = vi.fn();

function stubDisplayMedia(implementation: () => Promise<MediaStream>): void {
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getDisplayMedia: implementation },
  });
}

function fakeStream(): MediaStream {
  return { getTracks: () => [{ stop: stopTrack }] } as unknown as MediaStream;
}

/** jsdom has no media pipeline, so the video element is driven by hand. */
function stubVideoElement(options: { width: number; height: number; frame: boolean }): void {
  const original = document.createElement.bind(document);
  vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
    const element = original(tag);
    if (tag === 'video') {
      Object.defineProperty(element, 'videoWidth', { value: options.width });
      Object.defineProperty(element, 'videoHeight', { value: options.height });
      Object.defineProperty(element, 'play', { value: () => Promise.resolve() });
      Object.defineProperty(element, 'requestVideoFrameCallback', {
        value: (callback: () => void) => {
          if (options.frame) {
            setTimeout(callback, 0);
          }
        },
      });
    }
    if (tag === 'canvas') {
      Object.defineProperty(element, 'getContext', { value: () => ({ drawImage: vi.fn() }) });
      Object.defineProperty(element, 'toDataURL', { value: () => 'data:image/png;base64,AAA' });
    }
    return element;
  });
}

describe('screen capture', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    stopTrack.mockReset();
    Reflect.deleteProperty(navigator, 'mediaDevices');
  });

  // No mobile browser implements getDisplayMedia. The UI asks before it offers
  // the button, so a phone never shows a control that can only fail.
  it('reports no support when the browser has no getDisplayMedia', async () => {
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: {} });

    expect(isScreenCaptureSupported()).toBe(false);
    expect(await captureDisplayFrame()).toEqual({
      status: ScreenCaptureStatus.UNSUPPORTED,
      dataUrl: null,
    });
  });

  it('returns a png once the surface has painted a frame', async () => {
    stubDisplayMedia(() => Promise.resolve(fakeStream()));
    stubVideoElement({ width: 1280, height: 720, frame: true });

    const result = await captureDisplayFrame();

    expect(result.status).toBe(ScreenCaptureStatus.CAPTURED);
    expect(result.dataUrl).toBe('data:image/png;base64,AAA');
  });

  // Dismissing the browser's picker is a decision, not a failure. It used to
  // surface as "Capture unavailable", blaming the user for their own choice.
  it('treats a dismissed picker as cancelled rather than failed', async () => {
    const denied = new Error('denied');
    denied.name = 'NotAllowedError';
    stubDisplayMedia(() => Promise.reject(denied));

    expect((await captureDisplayFrame()).status).toBe(ScreenCaptureStatus.CANCELLED);
  });

  // The first version stopped tracks only on success, so a failed capture left
  // the browser's "sharing your screen" indicator running.
  it('stops the stream even when the capture fails', async () => {
    stubDisplayMedia(() => Promise.resolve(fakeStream()));
    stubVideoElement({ width: 0, height: 0, frame: true });

    const result = await captureDisplayFrame();

    expect(result.status).toBe(ScreenCaptureStatus.FAILED);
    expect(stopTrack).toHaveBeenCalledTimes(1);
  });

  // Without a bound, a surface that never paints left the dialog stuck on
  // "Capturing…" with no way out.
  it('gives up instead of waiting forever for a frame that never arrives', async () => {
    vi.useFakeTimers();
    stubDisplayMedia(() => Promise.resolve(fakeStream()));
    stubVideoElement({ width: 1280, height: 720, frame: false });

    const pending = captureDisplayFrame();
    await vi.advanceTimersByTimeAsync(6000);
    const result = await pending;

    expect(result.status).toBe(ScreenCaptureStatus.FAILED);
    expect(stopTrack).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});
