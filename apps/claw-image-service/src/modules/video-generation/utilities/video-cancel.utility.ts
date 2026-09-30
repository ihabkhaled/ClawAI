import { HttpStatus } from '@nestjs/common';

import { BusinessException } from '../../../common/errors';
import type { VideoGenerationStatus } from '../../../generated/prisma';
import {
  VIDEO_ACTIVE_STATUSES,
  VIDEO_GENERATION_CANCELLED_CODE,
  VIDEO_GENERATION_CANCELLED_MESSAGE,
} from '../constants/video-generation.constants';

/** True while a generation can still be cancelled. */
export function isActiveVideoStatus(status: VideoGenerationStatus): boolean {
  return VIDEO_ACTIVE_STATUSES.includes(status);
}

/** Thrown by the execution path when it finds its row CANCELLED. */
export function videoCancelled(): BusinessException {
  return new BusinessException(
    VIDEO_GENERATION_CANCELLED_MESSAGE,
    VIDEO_GENERATION_CANCELLED_CODE,
    HttpStatus.CONFLICT,
  );
}

/** True for the exception `videoCancelled` builds. */
export function isVideoCancelledError(error: unknown): boolean {
  return error instanceof BusinessException && error.code === VIDEO_GENERATION_CANCELLED_CODE;
}
