import { useState } from 'react';

import { useImageGenerationListener } from '@/hooks/chat/use-image-generation-listener';
import { useTranslation } from '@/lib/i18n';
import { imageGenerationRepository } from '@/repositories/image-generation/image-generation.repository';
import type {
  UseImageGenerationBubbleStateParams,
  UseImageGenerationBubbleStateReturn,
} from '@/types';
import { getImageRuntimeStageKey, logger } from '@/utilities';

/**
 * State behind one chat image card.
 *
 * Retries act on the row the card is SHOWING — after an auto-fallback that is
 * the fallback's row, not the id the message was stored with — because
 * image-service refuses (409) to retry a row another attempt already took
 * over. A retry-alternate's new row is also linked server-side, so a refresh
 * lands on it through `latest` even without this local state.
 */
export const useImageGenerationBubbleState = ({
  generationId,
}: UseImageGenerationBubbleStateParams): UseImageGenerationBubbleStateReturn => {
  const { t } = useTranslation();
  const [activeGenId, setActiveGenId] = useState(generationId);
  const [restartToken, setRestartToken] = useState(0);
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
      .then(() => {
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

  return {
    activeGenId: displayedId,
    generation,
    stageText,
    handleRetry,
    handleRetryWithModel,
  };
};
