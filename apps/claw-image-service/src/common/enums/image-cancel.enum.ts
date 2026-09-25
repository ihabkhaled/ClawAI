/**
 * What one `POST /images/:id/cancel` (or the execution path answering it) did,
 * as written on the `imageCancel` log line.
 */
export enum ImageCancelOutcome {
  /** The row was still running and is now CANCELLED. */
  CANCELLED = 'CANCELLED',
  /** The row was already terminal (COMPLETED/FAILED/TIMED_OUT/CANCELLED); nothing changed. */
  NOOP = 'NOOP',
  /** The execution path found its row CANCELLED and dropped the provider's result. */
  DISCARDED = 'DISCARDED',
}

/**
 * What a cancel did about the upstream runtime. Never claims more than was
 * done: a cloud image API has no cancel, so the call runs to the end upstream
 * and only its result is thrown away.
 */
export enum ImageProviderCancel {
  /** QUEUED/STARTING: no provider call had been made yet. */
  NOT_STARTED = 'not_started',
  /** OpenAI / Gemini / xAI: no upstream cancel exists; the result is discarded. */
  UNSUPPORTED = 'unsupported',
  /** Local runtime (SD WebUI `/sdapi/v1/interrupt`, ComfyUI `/interrupt`) was asked to stop. */
  REQUESTED = 'requested',
}
