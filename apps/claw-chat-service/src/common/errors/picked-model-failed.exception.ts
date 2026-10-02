import { HttpStatus } from '@nestjs/common';

import { BusinessException } from './business.exception';
import {
  PICKED_MODEL_FAILED_CODE,
  PICKED_MODEL_FAILED_MESSAGE_KEY,
} from '../../modules/chat-messages/constants/picked-model-fallback.constants';
import type { SuggestedModel } from '../../modules/chat-messages/types/picked-model-fallback.types';

/**
 * The model the user picked failed, and so did every substitute tried for it.
 *
 * Carries what the bubble needs to recover in one click: up to three usable
 * models to retry with (`suggestedModels`, never one already tried) and the
 * pick itself. `message` is our own sentence; provider text is never kept.
 */
export class PickedModelFailedException extends BusinessException {
  constructor(
    message: string,
    public readonly failedProvider: string,
    public readonly failedModel: string,
    public readonly suggestedModels: readonly SuggestedModel[],
  ) {
    super(
      message,
      PICKED_MODEL_FAILED_CODE,
      HttpStatus.BAD_GATEWAY,
      PICKED_MODEL_FAILED_MESSAGE_KEY,
    );
  }
}
