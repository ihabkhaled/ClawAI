import { useEffect, useRef, useState } from 'react';

import { messageSpeechRepository } from '@/repositories/chat/message-speech.repository';
import type { MessageSpeechState, UseSpeechSegmentBlobsReturn } from '@/types/message-speech.types';
import { logger } from '@/utilities';
import { findSpeechSegment, nextSpeechSegmentIndex } from '@/utilities/message-speech.utility';

/**
 * Object URLs for the segment being played and the one after it, fetched
 * through the authenticated client (the audio is an ordinary user-owned
 * file, never a public URL). Preloading the next segment is what makes the
 * hand-over near-gapless. Each segment is fetched at most once; URLs of parts
 * already played are revoked as playback moves on, and all of them on unmount.
 */
export function useSpeechSegmentBlobs(
  state: MessageSpeechState | undefined,
  currentIndex: number,
): UseSpeechSegmentBlobsReturn {
  const [urls, setUrls] = useState<Partial<Record<number, string>>>({});
  const [failedIndex, setFailedIndex] = useState<number | null>(null);
  const requestedRef = useRef(new Set<number>());
  const createdRef = useRef(new Map<number, string>());
  const mountedRef = useRef(true);

  const currentFileId = findSpeechSegment(state, currentIndex)?.fileId;
  const next = findSpeechSegment(state, nextSpeechSegmentIndex(state, currentIndex) ?? -1);
  const nextFileId = next?.fileId;
  const nextIndex = next?.index ?? -1;

  useEffect(() => {
    mountedRef.current = true;
    const wanted: ReadonlyArray<readonly [number, string | undefined]> = [
      [currentIndex, currentFileId],
      [nextIndex, nextFileId],
    ];
    for (const [index, fileId] of wanted) {
      if (fileId === undefined || requestedRef.current.has(index)) {
        continue;
      }
      requestedRef.current.add(index);
      void messageSpeechRepository
        .getSegmentAudio(fileId)
        .then((blob) => {
          if (!mountedRef.current) {
            return;
          }
          const url = URL.createObjectURL(blob);
          createdRef.current.set(index, url);
          setUrls((previous) => ({ ...previous, [index]: url }));
        })
        .catch((error: unknown) => {
          if (mountedRef.current) {
            setFailedIndex(index);
          }
          logger.warn({
            component: 'chat',
            action: 'speech-segment-audio-error',
            message: error instanceof Error ? error.message : 'segment audio failed',
            details: { index },
          });
        });
    }
  }, [currentIndex, currentFileId, nextIndex, nextFileId]);

  useEffect(() => {
    for (const [index, url] of createdRef.current) {
      if (index < currentIndex) {
        URL.revokeObjectURL(url);
        createdRef.current.delete(index);
      }
    }
  }, [currentIndex]);

  useEffect(() => {
    const created = createdRef.current;
    return () => {
      mountedRef.current = false;
      for (const url of created.values()) {
        URL.revokeObjectURL(url);
      }
      created.clear();
    };
  }, []);

  return { urls, hasError: failedIndex === currentIndex };
}
