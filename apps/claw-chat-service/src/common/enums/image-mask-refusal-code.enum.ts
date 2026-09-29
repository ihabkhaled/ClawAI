/**
 * The two 422 codes image-service answers a masked edit with (pack §81). The
 * values are the wire codes; the frontend maps each to its own translated
 * sentence, so they must stay in step with image-service's `ImageFailureCode`.
 */
export enum ImageMaskRefusalCode {
  MASK_INVALID = 'IMAGE_MASK_INVALID',
  MASK_NOT_SUPPORTED = 'IMAGE_MASK_NOT_SUPPORTED',
}
