/** video-service has no SSE: the card polls `GET /videos/:id` this often. */
export const VIDEO_GENERATION_POLL_INTERVAL_MS = 4000;

/** Hard cap on polls per card: 225 x 4 s = 15 minutes, never infinite. */
export const VIDEO_GENERATION_MAX_POLLS = 225;

/** Consecutive failed reads after which the card stops polling. */
export const VIDEO_GENERATION_MAX_CONSECUTIVE_ERRORS = 5;

/** How many `supersededById` links one card follows (AUTO fallback chain). */
export const VIDEO_GENERATION_MAX_FOLLOW_HOPS = 8;

/** Filename offered by the completed card's Download link. */
export const VIDEO_DOWNLOAD_FILENAME = 'claw-video.mp4';

/**
 * How to recognise a video-OUTPUT model listed under an ordinary chat connector.
 * Mirror of `VIDEO_OUTPUT_MODEL_PATTERNS_BY_CONNECTOR` in
 * packages/shared-utilities/src/video-generation/video-generation.constants.ts
 * (that package's root barrel pulls server-only modules, so the browser bundle
 * cannot import it). Keep the two in step.
 */
export const VIDEO_OUTPUT_MODEL_PATTERNS_BY_CONNECTOR: ReadonlyMap<string, RegExp> = new Map([
  ['GEMINI', /^(models\/)?veo-[\w.-]+$/iu],
  ['GROK', /^grok-imagine-video[\w.-]*$/iu],
]);
