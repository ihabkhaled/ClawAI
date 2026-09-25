/**
 * Whether a transcription attempt got a PAYG hold.
 *
 * `REFUSED` is a RESULT, not a throw: the candidate loop must not mistake a
 * credit refusal for a provider failure and fall through to a second paid
 * provider.
 */
export enum TranscriptionReserveStatus {
  HELD = 'HELD',
  REFUSED = 'REFUSED',
}

/**
 * How one candidate attempt ended when it did not throw (`COMPLETED` /
 * `REFUSED`), and — for the whole candidate loop — `FAILED` when every
 * candidate that was tried threw.
 */
export enum TranscriptionAttemptStatus {
  COMPLETED = 'COMPLETED',
  REFUSED = 'REFUSED',
  FAILED = 'FAILED',
  /**
   * The caller's AbortSignal fired (a video cancel). Ends the walk: never a
   * reason to try the next provider, and any hold was RELEASED, not finalized.
   */
  CANCELLED = 'CANCELLED',
}
