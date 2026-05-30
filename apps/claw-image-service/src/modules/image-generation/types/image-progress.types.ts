import type { ClawRuntimeProgressEvent } from '@claw/shared-types';

/**
 * Callback invoked synchronously by the execution manager for every
 * {@link ClawRuntimeProgressEvent} emitted while a generation is in flight.
 * The image-service uses this to bridge runtime-progress envelopes into the
 * existing SSE channel and the persisted ImageGenerationEvent log.
 */
export type ImageProgressCallback = (event: ClawRuntimeProgressEvent) => void;
