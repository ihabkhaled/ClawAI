/**
 * Why a transcription was refused by the PAYG credit check (multimodal batch 4).
 *
 * The values are spelled exactly like the matching members of
 * `FileTranscribeFailureReasonCode` in `@claw/shared-types`, so the manager can
 * publish them on `file.transcribe_failed` without a lookup table drifting.
 */
export enum TranscriptionCreditRefusalCode {
  /** The uploader's credit cannot cover the clip (a 402, or a clamped hold). */
  INSUFFICIENT_CREDIT = 'INSUFFICIENT_CREDIT',
  /** The check itself could not run — meter unreachable, model unpriced. Fails closed. */
  CREDIT_CHECK_UNAVAILABLE = 'CREDIT_CHECK_UNAVAILABLE',
}
