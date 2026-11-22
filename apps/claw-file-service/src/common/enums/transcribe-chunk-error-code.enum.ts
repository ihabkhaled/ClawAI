/**
 * Wire `code`s of `POST /internal/files/transcribe-chunk` (ADR-221, Live
 * Intelligence). Platform-paid, so there is no credit refusal among them.
 */
export enum TranscribeChunkErrorCode {
  /** The base64 decoded to no bytes. */
  EMPTY_AUDIO = 'TRANSCRIBE_CHUNK_EMPTY_AUDIO',
  /** Decoded audio over `TRANSCRIBE_CHUNK_MAX_BYTES` (413). */
  TOO_LARGE = 'TRANSCRIBE_CHUNK_TOO_LARGE',
  /** Measured audio longer than `TRANSCRIBE_CHUNK_MAX_SECONDS` (422). */
  TOO_LONG = 'TRANSCRIBE_CHUNK_TOO_LONG',
  /** Every candidate failed, or the walk ended on a terminal error (502). */
  FAILED = 'TRANSCRIBE_CHUNK_FAILED',
  /** No candidate exists, or the capability lookup failed (503). */
  UNAVAILABLE = 'TRANSCRIBE_CHUNK_UNAVAILABLE',
}
