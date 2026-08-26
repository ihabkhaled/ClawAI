import { SCREEN_CAPTURE_FRAME_TIMEOUT_MS } from '@/constants/feedback.constants';
import { ScreenCaptureStatus } from '@/enums';
import type { ScreenCaptureResult } from '@/types/feedback.types';

/**
 * Whether this browser can capture the screen at all.
 *
 * No mobile browser implements `getDisplayMedia`: neither iOS Safari nor
 * Android Chrome exposes screen capture to a web page. Offering the button
 * there guarantees a failure message on every tap, so the UI asks first and
 * falls back to the upload path — which on a phone opens the photo library,
 * where the OS screenshot already is.
 */
export function isScreenCaptureSupported(): boolean {
  return typeof navigator !== 'undefined' && navigator.mediaDevices?.getDisplayMedia !== undefined;
}

/**
 * Resolves once the video has painted a frame worth copying.
 *
 * The old capture drew on `loadedmetadata`, which fires when the dimensions are
 * known and not when pixels exist — so the screenshot was frequently blank. It
 * also had no timeout, so a surface that never produced a frame left the dialog
 * stuck on "Capturing…" forever.
 */
async function waitForFirstFrame(video: HTMLVideoElement): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('screen capture produced no frame'));
    }, SCREEN_CAPTURE_FRAME_TIMEOUT_MS);

    const settle = (): void => {
      clearTimeout(timer);
      resolve();
    };

    // `requestVideoFrameCallback` fires on a real composited frame. Where it is
    // missing, `loadeddata` plus a repaint is the closest equivalent.
    if (typeof video.requestVideoFrameCallback === 'function') {
      video.requestVideoFrameCallback(() => settle());
    } else {
      video.addEventListener('loadeddata', () => requestAnimationFrame(settle), { once: true });
    }
    video.addEventListener(
      'error',
      () => {
        clearTimeout(timer);
        reject(new Error('screen capture video failed'));
      },
      { once: true },
    );
  });
}

/**
 * Grabs one frame of a user-selected surface as a PNG data URL.
 *
 * Cancelling the browser's picker is a decision, not a failure: it arrives as
 * `NotAllowedError` and is reported as CANCELLED so the dialog stays quiet
 * instead of accusing the user of an error they did not hit.
 *
 * The stream is stopped in `finally` no matter how this ends. Stopping it only
 * on the happy path, as the first version did, left the browser's "sharing your
 * screen" indicator running after a failed capture.
 */
export async function captureDisplayFrame(): Promise<ScreenCaptureResult> {
  if (!isScreenCaptureSupported()) {
    return { status: ScreenCaptureStatus.UNSUPPORTED, dataUrl: null };
  }

  let stream: MediaStream | null = null;
  try {
    stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });

    const video = document.createElement('video');
    video.srcObject = stream;
    video.muted = true;
    video.playsInline = true;
    await video.play();
    await waitForFirstFrame(video);

    const canvas = document.createElement('canvas');
    // The video's own dimensions, not the track settings: a track can report a
    // nominal size that does not match the frame actually delivered.
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    if (context === null || canvas.width === 0 || canvas.height === 0) {
      return { status: ScreenCaptureStatus.FAILED, dataUrl: null };
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    return { status: ScreenCaptureStatus.CAPTURED, dataUrl: canvas.toDataURL('image/png') };
  } catch (error) {
    const name = error instanceof Error ? error.name : '';
    const cancelled = name === 'NotAllowedError' || name === 'AbortError';
    return {
      status: cancelled ? ScreenCaptureStatus.CANCELLED : ScreenCaptureStatus.FAILED,
      dataUrl: null,
    };
  } finally {
    for (const track of stream?.getTracks() ?? []) {
      track.stop();
    }
  }
}
