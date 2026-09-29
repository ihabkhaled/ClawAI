import { HttpStatus } from '@nestjs/common';

import { ImageFailureCode } from '../../../common/enums';
import { BusinessException } from '../../../common/errors';
import { IMAGE_MASK_MAX_BYTES } from '../constants/image-edit.constants';
import { imageFailureMessage } from '../constants/image-failure.constants';
import { type ImageReference } from '../types/image-generation.types';
import { isPng, pngHasAlpha, readImageDimensions } from './image-dimensions.utility';

/** A 422 carrying the fixed sentence for the code plus which check failed. */
export function imageEditRefusal(code: ImageFailureCode, detail: string): BusinessException {
  return new BusinessException(
    `${imageFailureMessage(code)} (${detail})`,
    code,
    HttpStatus.UNPROCESSABLE_ENTITY,
  );
}

/**
 * Checks a mask against its source image (pack §81): PNG by MAGIC BYTES (the
 * declared mime type is not trusted), an alpha channel, at most
 * `IMAGE_MASK_MAX_BYTES`, and the SAME pixel size as the source. Throws a 422
 * `IMAGE_MASK_INVALID` naming the failed check.
 */
export function assertValidImageMask(mask: ImageReference, source: ImageReference): void {
  const maskBytes = Buffer.from(mask.base64, 'base64');
  if (maskBytes.length > IMAGE_MASK_MAX_BYTES) {
    throw imageEditRefusal(ImageFailureCode.MASK_INVALID, 'mask too large');
  }
  if (!isPng(maskBytes)) {
    throw imageEditRefusal(ImageFailureCode.MASK_INVALID, 'mask is not a PNG');
  }
  if (!pngHasAlpha(maskBytes)) {
    throw imageEditRefusal(ImageFailureCode.MASK_INVALID, 'mask has no alpha channel');
  }
  const maskSize = readImageDimensions(maskBytes);
  const sourceSize = readImageDimensions(Buffer.from(source.base64, 'base64'));
  if (
    maskSize?.width !== sourceSize?.width ||
    maskSize?.height !== sourceSize?.height ||
    maskSize === undefined
  ) {
    throw imageEditRefusal(ImageFailureCode.MASK_INVALID, 'mask size differs from the image');
  }
}
