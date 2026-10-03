import { VideoFailureCode } from '../../../common/enums';

import { type PaygReleaseReason } from '@claw/shared-entitlements';

import { VideoAssetRole, VideoGenerationStatus } from '../../../generated/prisma';

/** How often a running job asks the provider whether the clip is ready. */
export const VIDEO_POLL_INTERVAL_MS = 8_000;

/**
 * How long a job waits for the provider before it gives up. Veo and Grok Imagine
 * usually finish in one to four minutes; twelve is the ceiling past which the
 * user is better served by a stated failure than a spinner.
 */
export const VIDEO_MAX_WAIT_MS = 12 * 60 * 1_000;

/**
 * A row still running this long after its last write is an orphan of a dead
 * process. Longer than the wait budget so a healthy job is never mistaken for one.
 */
export const VIDEO_STALE_AFTER_MS = VIDEO_MAX_WAIT_MS + 5 * 60 * 1_000;

export const VIDEO_STALE_SWEEP_INTERVAL_MS = 60_000;

export const VIDEO_START_TIMEOUT_MS = 60_000;
export const VIDEO_POLL_TIMEOUT_MS = 30_000;
export const VIDEO_DOWNLOAD_TIMEOUT_MS = 180_000;
export const VIDEO_STORE_TIMEOUT_MS = 120_000;

/**
 * The largest clip stored (decoded bytes). file-service accepts 50 MB per file;
 * a 4 to 8 second 720p clip is a few MB, so this only stops a runaway response.
 */
export const VIDEO_MAX_BYTES = 40 * 1024 * 1024;

export const VIDEO_MIME_TYPE = 'video/mp4';
export const VIDEO_RESOLUTION = '720p';

export const GEMINI_DEFAULT_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
export const XAI_DEFAULT_BASE_URL = 'https://api.x.ai/v1';

/** The payg meter is asked for a hold sized on the seconds, never on tokens. */
export const VIDEO_PAYG_PROMPT_TOKENS = 0;
export const VIDEO_PAYG_NOMINAL_OUTPUT_TOKENS = 1;

export const VIDEO_ACTIVE_STATUSES: readonly VideoGenerationStatus[] = [
  VideoGenerationStatus.QUEUED,
  VideoGenerationStatus.STARTING,
  VideoGenerationStatus.GENERATING,
  VideoGenerationStatus.FINALIZING,
];

export const VIDEO_GENERATION_CANCELLED_CODE = 'VIDEO_GENERATION_CANCELLED';
export const VIDEO_GENERATION_CANCELLED_MESSAGE = 'Video generation was cancelled by the user';

export const VIDEO_CANCELLED_RELEASE_REASON: PaygReleaseReason = 'CANCELLED';
export const VIDEO_STORE_FAILED_RELEASE_REASON: PaygReleaseReason = 'CANCELLED';
export const VIDEO_STALE_RELEASE_REASON: PaygReleaseReason = 'CANCELLED';

/** How many `supersededById` hops a reader follows to find the chain head. */
export const VIDEO_CHAIN_MAX_HOPS = 4;

/** Credit refusals the meter can answer with, surfaced as their own failure. */
export const VIDEO_CREDIT_FAILURE_MESSAGE =
  'Video generation needs pay-as-you-go credit. Add credit or choose a shorter clip.';

/** Failures another provider cannot fix: the money is the user's, or the file is ours. */
export const NO_FALLBACK_CODES: readonly string[] = [
  VideoFailureCode.STORAGE_FAILED,
  VideoFailureCode.VIDEO_TOO_LARGE,
  VideoFailureCode.SOURCE_IMAGE_INVALID,
];

/** Every read of a generation carries its output clip. */
export const OUTPUT_ASSETS_INCLUDE = {
  assets: { where: { role: VideoAssetRole.OUTPUT }, orderBy: { createdAt: 'asc' as const } },
} as const;

/** Image-to-video: the source image formats both providers accept. */
export const VIDEO_SOURCE_IMAGE_MIME_TYPES: readonly string[] = [
  'image/jpeg',
  'image/png',
  'image/webp',
];

/** Largest source image (decoded bytes) sent to a provider. */
export const VIDEO_SOURCE_IMAGE_MAX_BYTES = 10 * 1024 * 1024;

/** The same limit as base64 text, so file-service's reply is bounded before it is decoded. */
export const VIDEO_SOURCE_IMAGE_MAX_BASE64_LENGTH =
  Math.ceil((VIDEO_SOURCE_IMAGE_MAX_BYTES * 4) / 3) + 4;

export const VIDEO_SOURCE_IMAGE_FETCH_TIMEOUT_MS = 30_000;

/** Refusals that name the MODEL, so a sibling Veo model may still accept the same request. */
export const VEO_MODEL_FALLBACK_CODES: readonly string[] = [
  VideoFailureCode.MODEL_UNAVAILABLE,
  VideoFailureCode.PROVIDER_REJECTED,
];

/** The longest provider reason stored beside a generic rejection. */
export const VIDEO_REJECTION_REASON_MAX_CHARACTERS = 200;
