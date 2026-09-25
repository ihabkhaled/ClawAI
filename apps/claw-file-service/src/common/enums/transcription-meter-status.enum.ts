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

/** How one candidate attempt ended when it did not throw. */
export enum TranscriptionAttemptStatus {
  COMPLETED = 'COMPLETED',
  REFUSED = 'REFUSED',
}
