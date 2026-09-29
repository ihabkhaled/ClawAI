/**
 * The two 422 codes image-service answers a masked edit with (pack §81), as
 * chat-service stores them on the refusal message. Keep the values in step with
 * `ImageFailureCode` in apps/claw-image-service.
 */
export enum ImageMaskRefusalCode {
  MaskInvalid = 'IMAGE_MASK_INVALID',
  MaskNotSupported = 'IMAGE_MASK_NOT_SUPPORTED',
}
