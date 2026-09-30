import { IMAGE_MASK_REFUSAL_METADATA_TYPE } from '@/constants/image-mask-editor.constants';
import { ImageMaskRefusalCode } from '@/enums/image-mask-refusal-code.enum';

const KNOWN_CODES: ReadonlySet<string> = new Set(Object.values(ImageMaskRefusalCode));

function isImageMaskRefusalCode(value: unknown): value is ImageMaskRefusalCode {
  return typeof value === 'string' && KNOWN_CODES.has(value);
}

/**
 * The 422 code a refused masked edit carries, or null. chat-service stores
 * `{ type: 'image_mask_refusal', maskRefusalCode }` on the assistant message
 * instead of a generic failure. An unknown code reads as null, so a newer
 * backend never renders a blank notice.
 */
export function readImageMaskRefusal(
  metadata: Record<string, unknown> | null,
): ImageMaskRefusalCode | null {
  if (metadata?.['type'] !== IMAGE_MASK_REFUSAL_METADATA_TYPE) {
    return null;
  }
  const code = metadata['maskRefusalCode'];
  return isImageMaskRefusalCode(code) ? code : null;
}
