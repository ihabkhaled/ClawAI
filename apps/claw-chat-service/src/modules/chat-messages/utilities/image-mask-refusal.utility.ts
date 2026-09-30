import { HttpStatus } from '@nestjs/common';

import { type ImageMaskRefusalCode } from '../../../common/enums';
import {
  IMAGE_MASK_CODES,
  IMAGE_MASK_FILE_ID_METADATA_KEY,
  IMAGE_MASK_REFUSAL_TEXT,
} from '../constants/image-mask-refusal.constants';
import type { LlmResponse } from '../types/execution.types';

/** The mask file id stored on a USER message's metadata, or undefined. */
export function readMaskFileId(metadata: unknown): string | undefined {
  if (typeof metadata !== 'object' || metadata === null) return undefined;
  const value = (metadata as Record<string, unknown>)[IMAGE_MASK_FILE_ID_METADATA_KEY];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

/**
 * The mask refusal code in an image-service 422 body, or undefined for any
 * other response. image-service's exception filter sends the machine code as `code`.
 */
export function readImageMaskRefusalCode(
  status: number,
  data: unknown,
): ImageMaskRefusalCode | undefined {
  if (status !== Number(HttpStatus.UNPROCESSABLE_ENTITY)) return undefined;
  if (typeof data !== 'object' || data === null || !('code' in data)) return undefined;
  const code = data.code;
  return typeof code === 'string' && IMAGE_MASK_CODES.includes(code)
    ? (code as ImageMaskRefusalCode)
    : undefined;
}

/**
 * The reply a masked edit gets when image-service refuses the mask: a finished
 * assistant message carrying the code, so the chat renders a translated notice
 * instead of a generic failure or a spinner.
 */
export function imageMaskRefusalResponse(
  code: ImageMaskRefusalCode,
  provider: string,
  model: string,
  startTime: number,
  usedFallback: boolean,
): LlmResponse {
  return {
    content: IMAGE_MASK_REFUSAL_TEXT[code],
    provider,
    model,
    latencyMs: Date.now() - startTime,
    finishReason: 'stop',
    usedFallback,
    imageMaskRefusal: { code },
  };
}
