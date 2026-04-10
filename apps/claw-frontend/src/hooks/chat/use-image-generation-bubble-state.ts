import { useState } from 'react';

import { imageGenerationRepository } from '@/repositories/image-generation/image-generation.repository';
import type {
  UseImageGenerationBubbleStateParams,
  UseImageGenerationBubbleStateReturn,
} from '@/types';
import { logger } from '@/utilities';

export const useImageGenerationBubbleState = ({
  generationId,
}: UseImageGenerationBubbleStateParams): UseImageGenerationBubbleStateReturn => {
  const [activeGenId, setActiveGenId] = useState(generationId);

  const handleRetry = (): void => {
    logger.info({ component: 'chat', action: 'image-gen-retry', message: 'Retrying image generation', details: { generationId: activeGenId } });
    void imageGenerationRepository.retry(activeGenId);
  };

  const handleRetryWithModel = (provider: string, model: string): void => {
    logger.info({ component: 'chat', action: 'image-gen-retry-alternate', message: 'Retrying image generation with alternate model', details: { generationId: activeGenId, provider, model } });
    void imageGenerationRepository.retryAlternate(activeGenId, provider, model).then((result) => {
      setActiveGenId(result.generationId);
    });
  };

  return {
    activeGenId,
    handleRetry,
    handleRetryWithModel,
  };
};
