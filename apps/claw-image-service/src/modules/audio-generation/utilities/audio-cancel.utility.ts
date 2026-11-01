import { HttpStatus } from '@nestjs/common';

import { BusinessException } from '../../../common/errors';
import type { AudioGenerationStatus } from '../../../generated/prisma';
import {
  AUDIO_ACTIVE_STATUSES,
  AUDIO_GENERATION_CANCELLED_CODE,
  AUDIO_GENERATION_CANCELLED_MESSAGE,
} from '../constants/audio-generation.constants';

/** True while a generation can still be cancelled. */
export function isActiveAudioStatus(status: AudioGenerationStatus): boolean {
  return AUDIO_ACTIVE_STATUSES.includes(status);
}

/** Thrown by the execution path when it finds its row CANCELLED. */
export function audioCancelled(): BusinessException {
  return new BusinessException(
    AUDIO_GENERATION_CANCELLED_MESSAGE,
    AUDIO_GENERATION_CANCELLED_CODE,
    HttpStatus.CONFLICT,
  );
}

export function isAudioCancelledError(error: unknown): boolean {
  return error instanceof BusinessException && error.code === AUDIO_GENERATION_CANCELLED_CODE;
}
