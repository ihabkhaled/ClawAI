import { HttpStatus } from '@nestjs/common';

import { BusinessException } from '../../../common/errors';
import { type ImageGenerationStatus } from '../../../generated/prisma';
import {
  IMAGE_ACTIVE_STATUSES,
  IMAGE_GENERATION_CANCELLED_CODE,
  IMAGE_GENERATION_CANCELLED_MESSAGE,
} from '../constants/image-cancel.constants';

/** True while a generation can still be cancelled. */
export function isActiveImageStatus(status: ImageGenerationStatus): boolean {
  return IMAGE_ACTIVE_STATUSES.includes(status);
}

/** Thrown by the execution path when it finds its row CANCELLED. */
export function imageCancelled(): BusinessException {
  return new BusinessException(
    IMAGE_GENERATION_CANCELLED_MESSAGE,
    IMAGE_GENERATION_CANCELLED_CODE,
    HttpStatus.CONFLICT,
  );
}

/** True for the exception `imageCancelled` builds. */
export function isImageCancelledError(error: unknown): boolean {
  return error instanceof BusinessException && error.code === IMAGE_GENERATION_CANCELLED_CODE;
}
