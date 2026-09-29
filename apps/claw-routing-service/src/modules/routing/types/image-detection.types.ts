import type { ImageGenerationSignals } from '@claw/shared-utilities';

/**
 * Result of classifying a user message as an image-generation request.
 *
 * `matched` is true when at least one of the detection signals fires; the
 * remaining fields explain WHICH, so callers can log it. The shape is owned by
 * `@claw/shared-utilities` (`ImageGenerationSignals`).
 */
export type ImageDetectionResult = ImageGenerationSignals;
