import { type PaygReleaseReason } from '@claw/shared-entitlements';

import { ImageGenerationStatus } from '../../../generated/prisma';

/**
 * Statuses of a generation that is still running — the only ones a cancel can
 * move to CANCELLED. The conditional update in
 * `ImageGenerationRepository.cancelIfActive` matches on exactly this list, so
 * a row that finished a millisecond earlier stays finished.
 */
export const IMAGE_ACTIVE_STATUSES: readonly ImageGenerationStatus[] = [
  ImageGenerationStatus.QUEUED,
  ImageGenerationStatus.STARTING,
  ImageGenerationStatus.GENERATING,
  ImageGenerationStatus.FINALIZING,
];

/** Active statuses in which no provider call (and no PAYG hold) exists yet. */
export const IMAGE_PRE_PROVIDER_STATUSES: readonly ImageGenerationStatus[] = [
  ImageGenerationStatus.QUEUED,
  ImageGenerationStatus.STARTING,
];

/**
 * Error code the execution manager throws when it finds its row CANCELLED.
 * Never stored on a row and never streamed as a failure: the service catches
 * it and leaves the row CANCELLED.
 */
export const IMAGE_GENERATION_CANCELLED_CODE = 'IMAGE_GENERATION_CANCELLED';

/** Internal message on that exception (log only; the user sees the CANCELLED status). */
export const IMAGE_GENERATION_CANCELLED_MESSAGE = 'Image generation was cancelled by the user';

/** auth-service release reason for a hold given back because the user cancelled. */
export const IMAGE_CANCELLED_RELEASE_REASON: PaygReleaseReason = 'CANCELLED';

/** What the settlement log line names as the cause of that release. */
export const IMAGE_CANCELLED_LOG_REASON = 'USER_CANCELLED';
