import { ServiceUnavailableException } from '@nestjs/common';

import { STEP_ERROR_CAUSE_DEPTH } from '../generation/constants/step-recorder.constants';

/**
 * The chat gateway refused or failed one model call. Carries what the coded error frame said so
 * the healing ladder can wait as long as the provider asked (`retryAfterMs`) and the owner's step
 * log can show the gateway's own redacted sentence (`upstreamMessage`, at most 300 characters).
 * The message text keeps the `Chat model request failed (<status>: <CODE>)` shape that
 * `parseStepError` reads.
 */
export class ChatUpstreamError extends ServiceUnavailableException {
  constructor(
    message: string,
    readonly upstreamMessage: string | null,
    readonly retryAfterMs: number | null,
  ) {
    super(message);
    this.name = 'ChatUpstreamError';
  }
}

/** The upstream error on this error's cause chain, if any. */
export function findUpstreamError(error: unknown): ChatUpstreamError | undefined {
  let current: unknown = error;
  for (let depth = 0; depth < STEP_ERROR_CAUSE_DEPTH && current instanceof Error; depth += 1) {
    if (current instanceof ChatUpstreamError) return current;
    current = current.cause;
  }
  return undefined;
}
