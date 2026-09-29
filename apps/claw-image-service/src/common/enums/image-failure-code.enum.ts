/**
 * Why an image generation failed, as stored on `ImageGeneration.errorCode` and
 * streamed over SSE.
 *
 * Every value except `PROVIDER_FAILURE` names a cause the user can act on, and
 * the frontend maps each one to its own translated sentence. `PROVIDER_FAILURE`
 * is the fallback for an error nothing below recognises — it used to be the
 * ONLY code, so a retired model, a revoked key, an exhausted quota and a
 * file-service outage all read "Image generation failed. Please try again."
 */
export enum ImageFailureCode {
  PROVIDER_FAILURE = 'PROVIDER_FAILURE',
  PROVIDER_AUTH_FAILED = 'IMAGE_PROVIDER_AUTH_FAILED',
  PROVIDER_QUOTA_EXCEEDED = 'IMAGE_PROVIDER_QUOTA_EXCEEDED',
  PROVIDER_REJECTED = 'IMAGE_PROVIDER_REJECTED',
  MODEL_UNAVAILABLE = 'IMAGE_MODEL_UNAVAILABLE',
  CONTENT_REJECTED = 'IMAGE_CONTENT_REJECTED',
  NO_IMAGE_RETURNED = 'IMAGE_NO_IMAGE_RETURNED',
  PROVIDER_UNAVAILABLE = 'IMAGE_PROVIDER_UNAVAILABLE',
  CONNECTOR_NOT_CONFIGURED = 'IMAGE_CONNECTOR_NOT_CONFIGURED',
  STORAGE_FAILED = 'IMAGE_STORAGE_FAILED',
  // A retry whose stored reference image could not be read back (deleted,
  // file-service down). Generating without it would silently drop the edit.
  REFERENCE_UNAVAILABLE = 'IMAGE_REFERENCE_UNAVAILABLE',
  // An attached image to edit, but the provider cannot use a reference image
  // (Grok, ComfyUI). Generating anyway would ignore the user's picture.
  EDIT_UNAVAILABLE = 'IMAGE_EDIT_UNAVAILABLE',
  // A mask was sent for a provider that cannot apply one (422, pack §81).
  MASK_NOT_SUPPORTED = 'IMAGE_MASK_NOT_SUPPORTED',
  // The mask is not a PNG with alpha, too large, or not the source's size (422).
  MASK_INVALID = 'IMAGE_MASK_INVALID',
}
