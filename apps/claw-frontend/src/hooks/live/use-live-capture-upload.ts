import { useMutation } from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';

import { LIVE_CAPTURE_FATAL_UPLOAD_STATUSES } from '@/constants/live.constants';
import { liveRepository } from '@/repositories/live/live.repository';
import { ApiClientError } from '@/services/shared/api-client';
import type { LiveAudioChunkInput } from '@/types/live.types';

/**
 * Sends each tab-audio chunk once (never retried: the next chunk is 6 s away anyway). A 404/409/422
 * means the session can no longer take audio, so `onFatal` stops the capture; anything else is logged
 * and the capture goes on.
 */
export function useLiveCaptureUpload(
  sessionId: string | null,
  onFatal: () => void,
): (chunk: LiveAudioChunkInput) => void {
  const fatalRef = useRef(onFatal);
  const { mutate } = useMutation({
    mutationFn: (value: { id: string; chunk: LiveAudioChunkInput }) =>
      liveRepository.uploadAudio(value.id, value.chunk),
    onError: (error: Error) => {
      console.warn('Live audio chunk was not accepted', error.message);
      if (error instanceof ApiClientError && LIVE_CAPTURE_FATAL_UPLOAD_STATUSES.has(error.status)) {
        fatalRef.current();
      }
    },
  });

  useEffect(() => {
    fatalRef.current = onFatal;
  }, [onFatal]);

  return useCallback(
    (chunk: LiveAudioChunkInput): void => {
      if (sessionId !== null) {
        mutate({ id: sessionId, chunk });
      }
    },
    [mutate, sessionId],
  );
}
