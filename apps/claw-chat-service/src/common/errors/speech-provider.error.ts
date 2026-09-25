/**
 * A TTS provider call that did not return audio (multimodal batch 9).
 * `status` is the provider's HTTP status when it answered, null when it did
 * not; `timedOut` marks a call aborted at its deadline. Carries no text and no
 * key — only what the candidate walk needs to decide what happens next.
 */
export class SpeechProviderError extends Error {
  readonly status: number | null;
  readonly timedOut: boolean;

  constructor(message: string, status: number | null, timedOut: boolean) {
    super(message);
    this.name = 'SpeechProviderError';
    this.status = status;
    this.timedOut = timedOut;
  }
}
