/**
 * A TTS provider call that did not return audio (multimodal batch 9).
 * `status` is the provider's HTTP status when it answered, null when it did
 * not; `timedOut` marks a call aborted at its deadline; `rateLimited` marks a
 * 429 / RESOURCE_EXHAUSTED, with the provider's own retry hint in
 * `retryAfterMs` when it gave one. Carries no text and no key — only what the
 * candidate walk needs to decide what happens next.
 */
export class SpeechProviderError extends Error {
  readonly status: number | null;
  readonly timedOut: boolean;
  readonly rateLimited: boolean;
  readonly retryAfterMs: number | null;

  constructor(
    message: string,
    status: number | null,
    timedOut: boolean,
    rateLimited = false,
    retryAfterMs: number | null = null,
  ) {
    super(message);
    this.name = 'SpeechProviderError';
    this.status = status;
    this.timedOut = timedOut;
    this.rateLimited = rateLimited;
    this.retryAfterMs = rateLimited ? retryAfterMs : null;
  }
}
