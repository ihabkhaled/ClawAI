'use client';

import { useEffect, useRef, type ReactElement } from 'react';

import { useTranslation } from '@/lib/i18n/use-translation';
import type { RecordingCameraPreviewProps } from '@/types';

/**
 * Live `<video>` preview of the camera track already being recorded by
 * MediaRecorder — muted (it is a preview, not a monitor) and mirrored so a
 * front camera reads naturally, like every other camera preview.
 */
export function RecordingCameraPreview({ stream }: RecordingCameraPreviewProps): ReactElement {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (video === null) {
      return;
    }
    video.srcObject = stream;
  }, [stream]);

  return (
    <video
      ref={videoRef}
      autoPlay
      muted
      playsInline
      aria-label={t('chat.recorder.cameraPreviewLabel')}
      className="h-full w-full scale-x-[-1] rounded-2xl bg-black object-cover"
      data-testid="recording-camera-preview"
    />
  );
}
