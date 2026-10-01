/**
 * Why a video generation failed, as stored on `VideoGeneration.errorCode`.
 *
 * Every value except `PROVIDER_FAILURE` names a cause the user can act on, and
 * the frontend maps each one to its own translated sentence. Video is slow and
 * expensive, so "try again" is the wrong answer to a policy block, a retired
 * model or an exhausted quota — each gets its own code.
 */
export enum VideoFailureCode {
  PROVIDER_FAILURE = 'VIDEO_PROVIDER_FAILURE',
  PROVIDER_AUTH_FAILED = 'VIDEO_PROVIDER_AUTH_FAILED',
  PROVIDER_QUOTA_EXCEEDED = 'VIDEO_PROVIDER_QUOTA_EXCEEDED',
  PROVIDER_REJECTED = 'VIDEO_PROVIDER_REJECTED',
  PROVIDER_UNAVAILABLE = 'VIDEO_PROVIDER_UNAVAILABLE',
  MODEL_UNAVAILABLE = 'VIDEO_MODEL_UNAVAILABLE',
  CONTENT_REJECTED = 'VIDEO_CONTENT_REJECTED',
  NO_VIDEO_RETURNED = 'VIDEO_NO_VIDEO_RETURNED',
  CONNECTOR_NOT_CONFIGURED = 'VIDEO_CONNECTOR_NOT_CONFIGURED',
  STORAGE_FAILED = 'VIDEO_STORAGE_FAILED',
  /** The provider did not finish inside the wait budget. */
  GENERATION_TIMED_OUT = 'VIDEO_GENERATION_TIMED_OUT',
  /** The process running the job died before it finished (stale-job recovery). */
  GENERATION_INTERRUPTED = 'VIDEO_GENERATION_INTERRUPTED',
  /** The clip would exceed what file-service accepts. */
  VIDEO_TOO_LARGE = 'VIDEO_TOO_LARGE',
  /** The attached source image is missing, not the user's, not JPEG/PNG/WebP, or too large. */
  SOURCE_IMAGE_INVALID = 'VIDEO_SOURCE_IMAGE_INVALID',
}
