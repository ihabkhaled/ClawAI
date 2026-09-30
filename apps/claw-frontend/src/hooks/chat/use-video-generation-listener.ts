import { useEffect, useRef, useState } from 'react';

import {
  VIDEO_GENERATION_MAX_CONSECUTIVE_ERRORS,
  VIDEO_GENERATION_MAX_FOLLOW_HOPS,
  VIDEO_GENERATION_MAX_POLLS,
  VIDEO_GENERATION_POLL_INTERVAL_MS,
} from '@/constants/video.constants';
import { videoGenerationRepository } from '@/repositories/video-generation/video-generation.repository';
import type { VideoGeneration, VideoGenerationFollowState } from '@/types/video-generation.types';
import { logger } from '@/utilities';
import {
  getSupersedingVideoGenerationId,
  isTerminalVideoStatus,
  toLatestVideoGeneration,
} from '@/utilities/video-generation.utility';

/**
 * Follows one video card's job to whatever row it ends on.
 *
 * video-service has no event stream, so the row is polled every
 * `VIDEO_GENERATION_POLL_INTERVAL_MS`, at most `VIDEO_GENERATION_MAX_POLLS`
 * times in total (15 minutes) — never indefinitely — and five failed reads in
 * a row stop it. An AUTO fallback continues a job on a NEW row and links the
 * old one to it (`supersededById`); the listener follows `latest` at most
 * `VIDEO_GENERATION_MAX_FOLLOW_HOPS` times, so a FAILED row is only the end of
 * the job when nothing superseded it.
 *
 * `restartToken` re-reads the tracked row, for a same-row retry or a cancel.
 */
export function useVideoGenerationListener(
  generationId: string | undefined,
  restartToken = 0,
): VideoGeneration | null {
  const [generation, setGeneration] = useState<VideoGeneration | null>(null);
  const [follow, setFollow] = useState<VideoGenerationFollowState>({
    rootId: generationId,
    trackedId: generationId,
  });
  const pollsRef = useRef(0);
  const hopsRef = useRef(0);
  // A new card (or a retry that got a new row) restarts the follow from its own row.
  const trackedId = follow.rootId === generationId ? follow.trackedId : generationId;

  useEffect(() => {
    pollsRef.current = 0;
    hopsRef.current = 0;
  }, [generationId, restartToken]);

  useEffect(() => {
    if (!trackedId) {
      return;
    }
    const rowId: string = trackedId;
    let disposed = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let errorCount = 0;

    const schedule = (): void => {
      if (disposed || pollsRef.current >= VIDEO_GENERATION_MAX_POLLS) {
        return;
      }
      timer = setTimeout(poll, VIDEO_GENERATION_POLL_INTERVAL_MS);
    };

    const applyRead = (gen: VideoGeneration): void => {
      const successorId = getSupersedingVideoGenerationId(gen);
      if (successorId !== undefined && hopsRef.current < VIDEO_GENERATION_MAX_FOLLOW_HOPS) {
        hopsRef.current += 1;
        setGeneration(toLatestVideoGeneration(gen));
        setFollow({ rootId: generationId, trackedId: successorId });
        return;
      }
      setGeneration(gen);
      if (!isTerminalVideoStatus(gen.status)) {
        schedule();
      }
    };

    function poll(): void {
      pollsRef.current += 1;
      void videoGenerationRepository
        .getById(rowId)
        .then((gen) => {
          if (disposed) {
            return;
          }
          errorCount = 0;
          applyRead(gen);
        })
        .catch(() => {
          if (disposed) {
            return;
          }
          errorCount += 1;
          logger.warn({
            component: 'chat',
            action: 'video-gen-poll-error',
            message: 'Failed to read video generation',
            details: { generationId: rowId, errorCount },
          });
          if (errorCount < VIDEO_GENERATION_MAX_CONSECUTIVE_ERRORS) {
            schedule();
          }
        });
    }

    poll();

    return () => {
      disposed = true;
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [trackedId, restartToken, generationId]);

  return generation;
}
