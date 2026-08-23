import { useCallback, useState } from 'react';

import type { UseScreenshotCaptureReturn } from '@/types/feedback-hook.types';

export function useScreenshotCapture(): UseScreenshotCaptureReturn {
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const capture = useCallback(async () => {
    setIsCapturing(true);
    setError(null);

    try {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getDisplayMedia) {
        setError('feedback.screenshot.unsupported');
        return;
      }

      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const track = stream.getVideoTracks()[0];

      if (!track) {
        throw new Error('No video track found');
      }

      const { width, height } = track.getSettings();
      const canvas = document.createElement('canvas');
      canvas.width = width ?? 1920;
      canvas.height = height ?? 1080;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('Could not get canvas context');
      }

      const video = document.createElement('video');
      video.srcObject = stream;
      video.autoplay = true;

      await new Promise<void>((resolve) => {
        video.onloadedmetadata = () => {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          resolve();
        };
      });

      const dataUrl = canvas.toDataURL('image/png');
      setScreenshot(dataUrl);

      // Immediately stop every track
      for (const track of stream.getTracks()) {
        track.stop();
      }
    } catch {
      setError('feedback.screenshot.failed');
    } finally {
      setIsCapturing(false);
    }
  }, []);

  const clear = useCallback(() => {
    setScreenshot(null);
    setError(null);
  }, []);

  return { capture, screenshot, clear, isCapturing, error };
}
