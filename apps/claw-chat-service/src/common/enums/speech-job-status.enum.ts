/**
 * Where one reply's progressive "Read aloud" job is (ADR-120 addendum,
 * 2026-09-25). Persisted in the assistant message's `metadata.speech.status`
 * and returned by `GET|POST /chat-messages/:id/speech`.
 */
export enum SpeechJobStatus {
  /** Never read aloud, or the stored reading is of different text. */
  NONE = 'NONE',
  /** Segments are being synthesised; the ones done so far are playable. */
  GENERATING = 'GENERATING',
  /** Every segment is stored and charged. */
  READY = 'READY',
  /** Some segments are stored (and charged), others failed (released, not charged). */
  PARTIAL = 'PARTIAL',
  /** No segment could be stored. Nothing was charged. */
  FAILED = 'FAILED',
}
