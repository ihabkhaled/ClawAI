import { useRef, useState } from 'react';

import { useVideoGenerationListener } from '@/hooks/chat/use-video-generation-listener';
import { videoGenerationRepository } from '@/repositories/video-generation/video-generation.repository';
import type {
  UseVideoGenerationBubbleStateParams,
  UseVideoGenerationBubbleStateReturn,
} from '@/types';
import { isInProgressVideoStatus, logger } from '@/utilities';

/**
 * State behind one chat video card.
 *
 * Retry and Cancel act on the row the card is SHOWING: after an AUTO fallback
 * that is the fallback's row, not the id the message was stored with. A retry
 * from a CANCELLED row answers with a successor id, which the card then follows.
 */
export const useVideoGenerationBubbleState = ({
  generationId,
}: UseVideoGenerationBubbleStateParams): UseVideoGenerationBubbleStateReturn => {
  const [activeGenId, setActiveGenId] = useState(generationId);
  const [restartToken, setRestartToken] = useState(0);
  const [isCancelling, setCancelling] = useState(false);
  // A ref, not the state: two presses in one render must still send ONE cancel.
  const cancelInFlight = useRef(false);
  const generation = useVideoGenerationListener(activeGenId, restartToken);
  const displayedId = generation?.id ?? activeGenId;

  const handleRetry = (): void => {
    logger.info({
      component: 'chat',
      action: 'video-gen-retry',
      message: 'Retrying video generation',
      details: { generationId: displayedId },
    });
    void videoGenerationRepository
      .retry(displayedId)
      .then((result) => {
        if (result.generationId !== displayedId) {
          setActiveGenId(result.generationId);
        }
        setRestartToken((token) => token + 1);
      })
      .catch(() => {
        logger.warn({
          component: 'chat',
          action: 'video-gen-retry-refused',
          message: 'Video generation retry was refused',
          details: { generationId: displayedId },
        });
      });
  };

  const handleCancel = (): void => {
    if (cancelInFlight.current) {
      return;
    }
    cancelInFlight.current = true;
    setCancelling(true);
    logger.info({
      component: 'chat',
      action: 'video-gen-cancel',
      message: 'Cancelling video generation',
      details: { generationId: displayedId },
    });
    void videoGenerationRepository
      .cancel(displayedId)
      .then(() => {
        setRestartToken((token) => token + 1);
      })
      .catch(() => {
        logger.warn({
          component: 'chat',
          action: 'video-gen-cancel-refused',
          message: 'Video generation cancel was refused',
          details: { generationId: displayedId },
        });
      })
      .finally(() => {
        cancelInFlight.current = false;
        setCancelling(false);
      });
  };

  return {
    activeGenId: displayedId,
    generation,
    handleRetry,
    canCancel: generation !== null && isInProgressVideoStatus(generation.status),
    isCancelling,
    handleCancel,
  };
};
