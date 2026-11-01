import { useEffect, useRef, useState } from 'react';

import {
  AUDIO_GENERATION_MAX_CONSECUTIVE_ERRORS,
  AUDIO_GENERATION_MAX_POLLS,
  AUDIO_GENERATION_POLL_INTERVAL_MS,
} from '@/constants/audio-generation.constants';
import { audioGenerationRepository } from '@/repositories/audio-generation/audio-generation.repository';
import type {
  AudioGenerationRow,
  UseAudioGenerationStateParams,
  UseAudioGenerationStateReturn,
} from '@/types/media-generation.types';
import { logger } from '@/utilities';
import { isInProgressAudioStatus, toDisplayedAudioRow } from '@/utilities/media-generation.utility';

/**
 * State behind one chat audio card. image-service has no event stream for audio, so the row is
 * polled every `AUDIO_GENERATION_POLL_INTERVAL_MS`, at most `AUDIO_GENERATION_MAX_POLLS` times
 * (never indefinitely), and five failed reads in a row stop it. The card shows the head of the
 * retry chain (`latest`), so a retry shows up without changing the id the message stored.
 * A reload of the thread starts from the stored id and lands on the same row.
 */
export const useAudioGenerationState = ({
  generationId,
}: UseAudioGenerationStateParams): UseAudioGenerationStateReturn => {
  const [generation, setGeneration] = useState<AudioGenerationRow | null>(null);
  const [restartToken, setRestartToken] = useState(0);
  const [pollStopped, setPollStopped] = useState(false);
  const displayedIdRef = useRef(generationId);

  useEffect(() => {
    let disposed = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let polls = 0;
    let errors = 0;

    const schedule = (): void => {
      if (disposed) {
        return;
      }
      if (polls >= AUDIO_GENERATION_MAX_POLLS) {
        setPollStopped(true);
        return;
      }
      timer = setTimeout(poll, AUDIO_GENERATION_POLL_INTERVAL_MS);
    };

    function poll(): void {
      polls += 1;
      void audioGenerationRepository
        .getById(generationId)
        .then((read) => {
          if (disposed) {
            return;
          }
          errors = 0;
          const row = toDisplayedAudioRow(read);
          displayedIdRef.current = row.id;
          setGeneration(row);
          if (isInProgressAudioStatus(row.status)) {
            schedule();
          }
        })
        .catch(() => {
          if (disposed) {
            return;
          }
          errors += 1;
          logger.warn({
            component: 'chat',
            action: 'audio-gen-poll-error',
            message: 'Failed to read audio generation',
            details: { generationId, errors },
          });
          if (errors < AUDIO_GENERATION_MAX_CONSECUTIVE_ERRORS) {
            schedule();
          } else {
            setPollStopped(true);
          }
        });
    }

    setPollStopped(false);
    poll();

    return () => {
      disposed = true;
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [generationId, restartToken]);

  const handleRetry = (): void => {
    const rowId = displayedIdRef.current;
    logger.info({
      component: 'chat',
      action: 'audio-gen-retry',
      message: 'Retrying audio generation',
      details: { generationId: rowId },
    });
    void audioGenerationRepository
      .retry(rowId)
      .then(() => {
        setRestartToken((token) => token + 1);
      })
      .catch(() => {
        logger.warn({
          component: 'chat',
          action: 'audio-gen-retry-refused',
          message: 'Audio generation retry was refused',
          details: { generationId: rowId },
        });
      });
  };

  return {
    generation,
    handleRetry,
    isStatusUnknown:
      pollStopped && (generation === null || isInProgressAudioStatus(generation.status)),
  };
};
