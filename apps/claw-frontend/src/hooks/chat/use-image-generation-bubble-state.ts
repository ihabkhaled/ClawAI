import { useRef, useState } from 'react';

import { useImageGenerationListener } from '@/hooks/chat/use-image-generation-listener';
import { useTranslation } from '@/lib/i18n';
import { imageGenerationRepository } from '@/repositories/image-generation/image-generation.repository';
import type {
  UseImageGenerationBubbleStateParams,
  UseImageGenerationBubbleStateReturn,
} from '@/types';
import { getImageRuntimeStageKey, isInProgressImageStatus, logger } from '@/utilities';

/**
 * State behind one chat image card.
 *
 * Retries act on the row the card is SHOWING — after an auto-fallback that is
 * the fallback's row, not the id the message was stored with — because
 * image-service refuses (409) to retry a row another attempt already took
 * over. A retry-alternate's new row is also linked server-side, so a refresh
 * lands on it through `latest` even without this local state.
 *
 * Cancel (pack §72) targets the shown row while it is in progress; the card
 * then re-reads it and shows CANCELLED (or the final status, when the job
 * ended first). A retry from a CANCELLED row gets a successor id and follows it.
 */
export const useImageGenerationBubbleState = ({
  generationId,
}: UseImageGenerationBubbleStateParams): UseImageGenerationBubbleStateReturn => {
  const { t } = useTranslation();
  const [activeGenId, setActiveGenId] = useState(generationId);
  const [restartToken, setRestartToken] = useState(0);
  const [isCancelling, setCancelling] = useState(false);
  // A ref, not the state: two presses in one render must still send ONE cancel.
  const cancelInFlight = useRef(false);
  const generation = useImageGenerationListener(activeGenId, restartToken);
  const displayedId = generation?.id ?? activeGenId;

  const progress = generation?.runtimeProgress ?? null;
  const stageText = progress
    ? [
        t(getImageRuntimeStageKey(progress.stage)),
        progress.currentStep !== undefined &&
        progress.totalSteps !== undefined &&
        progress.totalSteps > 0
          ? t('runtimeProgress.image.stepProgress', {
              current: String(progress.currentStep),
              total: String(progress.totalSteps),
            })
          : null,
      ]
        .filter((part): part is string => part !== null)
        .join(' · ')
    : undefined;

  const handleRetry = (): void => {
    logger.info({
      component: 'chat',
      action: 'image-gen-retry',
      message: 'Retrying image generation',
      details: { generationId: displayedId },
    });
    void imageGenerationRepository
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
          action: 'image-gen-retry-refused',
          message: 'Image generation retry was refused',
          details: { generationId: displayedId },
        });
      });
  };

  const handleRetryWithModel = (provider: string, model: string): void => {
    logger.info({
      component: 'chat',
      action: 'image-gen-retry-alternate',
      message: 'Retrying image generation with alternate model',
      details: { generationId: displayedId, provider, model },
    });
    void imageGenerationRepository
      .retryAlternate(displayedId, provider, model)
      .then((result) => {
        setActiveGenId(result.generationId);
      })
      .catch(() => {
        logger.warn({
          component: 'chat',
          action: 'image-gen-retry-alternate-refused',
          message: 'Image generation alternate retry was refused',
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
      action: 'image-gen-cancel',
      message: 'Cancelling image generation',
      details: { generationId: displayedId },
    });
    void imageGenerationRepository
      .cancel(displayedId)
      .then(() => {
        setRestartToken((token) => token + 1);
      })
      .catch(() => {
        logger.warn({
          component: 'chat',
          action: 'image-gen-cancel-refused',
          message: 'Image generation cancel was refused',
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
    stageText,
    handleRetry,
    handleRetryWithModel,
    canCancel: generation !== null && isInProgressImageStatus(generation.status),
    isCancelling,
    handleCancel,
  };
};
