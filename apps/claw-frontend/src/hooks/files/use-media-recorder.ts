'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  MEDIA_RECORDING_MAX_MS,
  MEDIA_RECORDING_TICK_MS,
  MEDIA_RECORDING_VIDEO_CONSTRAINTS,
} from '@/constants/media-recording.constants';
import { MediaRecordingError } from '@/enums/media-recording-error.enum';
import { MediaRecordingKind } from '@/enums/media-recording-kind.enum';
import type { UseMediaRecorderParams, UseMediaRecorderReturn } from '@/types';
import { logger } from '@/utilities';
import {
  buildRecordingFilename,
  normalizeRecordingMimeType,
} from '@/utilities/media-recording.utility';

/**
 * MediaRecorder behind one small surface, for composer voice and video notes.
 *
 * Three things this hook exists to guarantee:
 *
 *  1. **Tracks are always released.** A leaked microphone or camera is the
 *     worst failure mode here — the browser keeps the recording indicator lit
 *     and the device open until the tab dies. Every exit path (stop, cancel,
 *     the length cap, a recorder error, a failed construction, and unmount)
 *     funnels through `releaseStream`, which stops every track on the stream.
 *
 *  2. **Nothing fails silently.** A browser with no MediaRecorder, or a denied
 *     permission, sets `error` rather than doing nothing — a button that does
 *     nothing when clicked is indistinguishable from a broken product.
 *
 *  3. **Recordings are bounded.** `MEDIA_RECORDING_MAX_MS` stops the recorder
 *     and keeps what it has; see that constant for why a cap exists at all.
 *
 * The produced `File` carries the recorder's real mimeType, normalized to its
 * base type (file-service matches the declared mime against an exact
 * allowlist, and `audio/webm;codecs=opus` is not in it).
 */
export function useMediaRecorder({ onRecorded }: UseMediaRecorderParams): UseMediaRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [error, setError] = useState<MediaRecordingError | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef(0);
  const cancelledRef = useRef(false);
  const mountedRef = useRef(true);

  // The callback is read through a ref so a caller passing an inline arrow does
  // not have to memoize it to avoid restarting anything mid-recording.
  const onRecordedRef = useRef(onRecorded);
  useEffect(() => {
    onRecordedRef.current = onRecorded;
  }, [onRecorded]);

  // Computed once, lazily: `MediaRecorder` does not exist during SSR, and
  // touching `navigator` at module scope would break the server render.
  const [isSupported] = useState<boolean>(
    () =>
      typeof window !== 'undefined' &&
      typeof window.MediaRecorder !== 'undefined' &&
      typeof navigator !== 'undefined' &&
      typeof navigator.mediaDevices?.getUserMedia === 'function',
  );

  const clearTick = useCallback((): void => {
    if (tickRef.current !== null) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, []);

  const releaseStream = useCallback((): void => {
    clearTick();
    const stream = streamRef.current;
    streamRef.current = null;
    recorderRef.current = null;
    if (stream === null) {
      return;
    }
    for (const track of stream.getTracks()) {
      track.stop();
    }
  }, [clearTick]);

  const stopRecorder = useCallback(
    (cancelled: boolean): void => {
      cancelledRef.current = cancelled;
      const recorder = recorderRef.current;
      if (recorder !== null && recorder.state !== 'inactive') {
        // `onstop` does the releasing, so the last dataavailable is not lost.
        recorder.stop();
        return;
      }
      releaseStream();
      if (mountedRef.current) {
        setIsRecording(false);
        setElapsedMs(0);
      }
    },
    [releaseStream],
  );

  const stopRef = useRef(stopRecorder);
  useEffect(() => {
    stopRef.current = stopRecorder;
  }, [stopRecorder]);

  const start = useCallback(
    async (kind: MediaRecordingKind): Promise<void> => {
      if (recorderRef.current !== null) {
        return;
      }
      setError(null);
      if (!isSupported) {
        setError(MediaRecordingError.Unsupported);
        return;
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(
          kind === MediaRecordingKind.Video
            ? { audio: true, video: MEDIA_RECORDING_VIDEO_CONSTRAINTS }
            : { audio: true },
        );
      } catch (permissionError) {
        logger.warn({
          component: 'chat',
          action: 'recorder-permission-denied',
          message: (permissionError as Error).message,
          details: { kind },
        });
        if (mountedRef.current) {
          setError(MediaRecordingError.PermissionDenied);
        }
        return;
      }

      // Unmounted while the permission prompt was open: release and stop.
      if (!mountedRef.current) {
        for (const track of stream.getTracks()) {
          track.stop();
        }
        return;
      }

      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(stream);
      } catch (constructError) {
        logger.warn({
          component: 'chat',
          action: 'recorder-construct-failed',
          message: (constructError as Error).message,
          details: { kind },
        });
        for (const track of stream.getTracks()) {
          track.stop();
        }
        setError(MediaRecordingError.Unsupported);
        return;
      }

      streamRef.current = stream;
      recorderRef.current = recorder;
      chunksRef.current = [];
      cancelledRef.current = false;

      recorder.ondataavailable = (event: BlobEvent): void => {
        if (event.data !== undefined && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onerror = (): void => {
        cancelledRef.current = true;
        if (mountedRef.current) {
          setError(MediaRecordingError.RecorderFailed);
        }
        stopRef.current(true);
      };

      recorder.onstop = (): void => {
        const cancelled = cancelledRef.current;
        const chunks = chunksRef.current;
        chunksRef.current = [];
        const mimeType = normalizeRecordingMimeType(recorder.mimeType, kind);
        releaseStream();
        if (mountedRef.current) {
          setIsRecording(false);
          setElapsedMs(0);
        }
        if (cancelled || !mountedRef.current) {
          return;
        }
        const blob = new Blob(chunks, { type: mimeType });
        if (blob.size === 0) {
          setError(MediaRecordingError.EmptyRecording);
          return;
        }
        onRecordedRef.current(
          new File([blob], buildRecordingFilename(kind, mimeType), { type: mimeType }),
        );
      };

      recorder.start();
      setIsRecording(true);
      setElapsedMs(0);

      // Counted in ticks rather than from a wall-clock start time: the cap must
      // fire deterministically, and a machine that sleeps mid-recording should
      // not have its note retroactively truncated.
      clearTick();
      elapsedRef.current = 0;
      tickRef.current = setInterval(() => {
        elapsedRef.current += MEDIA_RECORDING_TICK_MS;
        setElapsedMs(elapsedRef.current);
        if (elapsedRef.current >= MEDIA_RECORDING_MAX_MS) {
          // Keep the take — a truncated voice note is still the user's note.
          stopRef.current(false);
        }
      }, MEDIA_RECORDING_TICK_MS);
    },
    [clearTick, isSupported, releaseStream],
  );

  const stop = useCallback((): void => {
    stopRecorder(false);
  }, [stopRecorder]);

  const cancel = useCallback((): void => {
    stopRecorder(true);
  }, [stopRecorder]);

  useEffect(() => {
    mountedRef.current = true;
    return (): void => {
      mountedRef.current = false;
      cancelledRef.current = true;
      const recorder = recorderRef.current;
      if (recorder !== null && recorder.state !== 'inactive') {
        recorder.stop();
      }
      releaseStream();
    };
  }, [releaseStream]);

  return { isRecording, isSupported, start, stop, cancel, elapsedMs, error };
}
