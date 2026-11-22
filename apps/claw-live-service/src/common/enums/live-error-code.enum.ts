/** Machine codes returned by the sessions/realtime/billing surface (`errorCode`, rule 18). */
export enum LiveErrorCode {
  LIVE_DISABLED = 'LIVE_DISABLED',
  LIVE_RIGHTS_ATTESTATION_REQUIRED = 'LIVE_RIGHTS_ATTESTATION_REQUIRED',
  LIVE_SESSION_LIMIT = 'LIVE_SESSION_LIMIT',
  LIVE_SESSION_RATE_LIMITED = 'LIVE_SESSION_RATE_LIMITED',
  CAPACITY = 'CAPACITY',
  LIVE_SESSION_NOT_FOUND = 'LIVE_SESSION_NOT_FOUND',
  LIVE_SESSION_CLOSED = 'LIVE_SESSION_CLOSED',
  LIVE_CLOSE_TOKEN_INVALID = 'LIVE_CLOSE_TOKEN_INVALID',
  /** Browser capture: the session is DETACHED, EXHAUSTED or CREDITS_REQUIRED (409). */
  LIVE_CAPTURE_SESSION_INACTIVE = 'LIVE_CAPTURE_SESSION_INACTIVE',
  /** Browser capture: the session's source is not a BROWSER_CAPTURE source (422). */
  LIVE_CAPTURE_NOT_SUPPORTED = 'LIVE_CAPTURE_NOT_SUPPORTED',
  /** Browser capture: another session owns the run's audio (409). */
  LIVE_CAPTURE_SESSION_MISMATCH = 'LIVE_CAPTURE_SESSION_MISMATCH',
  /** Browser capture: a chunk arrived sooner than the minimum interval (429). */
  LIVE_CAPTURE_RATE_LIMITED = 'LIVE_CAPTURE_RATE_LIMITED',
  /** Browser capture: not a PCM16 mono 16 kHz WAV of 1–8 s (422). */
  LIVE_CAPTURE_AUDIO_INVALID = 'LIVE_CAPTURE_AUDIO_INVALID',
  /** Browser capture: X-Chunk-Start-At missing or more than 2 min from server time (422). */
  LIVE_CAPTURE_CHUNK_TIME_INVALID = 'LIVE_CAPTURE_CHUNK_TIME_INVALID',
  /** Browser capture: body larger than 400 KB (413). */
  LIVE_CAPTURE_TOO_LARGE = 'LIVE_CAPTURE_TOO_LARGE',
}
