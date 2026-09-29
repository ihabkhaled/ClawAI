import { ImageMaskRefusalCode } from '../../../common/enums';

/** `metadata.type` of an assistant message that is a refused masked edit, not an answer. */
export const IMAGE_MASK_REFUSAL_METADATA_TYPE = 'image_mask_refusal';

/** The `metadata` key on a USER message carrying the file id of the drawn mask PNG. */
export const IMAGE_MASK_FILE_ID_METADATA_KEY = 'maskFileId';

/** Stored as the message text; the frontend shows a translated notice keyed on the code. */
export const IMAGE_MASK_REFUSAL_TEXT: Readonly<Record<ImageMaskRefusalCode, string>> = {
  [ImageMaskRefusalCode.MASK_INVALID]:
    'The mask could not be used: it must be a PNG with transparency, the same size as the image. Draw the area again and retry.',
  [ImageMaskRefusalCode.MASK_NOT_SUPPORTED]:
    'The selected image model cannot edit only part of an image. Pick a model that supports masks, or send the edit without a mask.',
};

/** Every code a refusal can carry, as plain strings for matching an untyped 422 body. */
export const IMAGE_MASK_CODES: readonly string[] = Object.values(ImageMaskRefusalCode);
