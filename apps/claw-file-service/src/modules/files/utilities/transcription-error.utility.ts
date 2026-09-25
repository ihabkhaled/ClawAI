import {
  TRANSCRIPTION_HTTP_STATUS_NOT_FOUND,
  TRANSCRIPTION_HTTP_STATUS_TOO_MANY_REQUESTS,
  TRANSCRIPTION_MODALITY_REJECTION_MARKERS,
  TRANSCRIPTION_QUOTA_EXHAUSTED_CODES,
} from '../constants/transcription.constants';
import { TranscriptionFailureKind, TranscriptionResponseIssue } from '../../../common/enums';
import { TranscriptionResponseError } from '../../../common/errors';
import { type ProviderErrorShape } from '../types/transcription-error.types';

function asErrorShape(error: unknown): ProviderErrorShape {
  return typeof error === 'object' && error !== null ? (error as ProviderErrorShape) : {};
}

/**
 * The provider's own explanation for a refusal, not axios's generic
 * "Request failed with status code 400". Same reach-into-the-response-body
 * approach as image-service's `extractProviderErrorMessage` (the pattern
 * this reuses): the shared `httpPost` wrapper resolves to `response.data` on
 * success but only re-throws the raw axios error on failure, and the body a
 * provider actually wrote — Gemini's and OpenAI's `{ error: { message } }` —
 * lives in `error.response.data`.
 */
export function extractTranscriptionErrorMessage(error: unknown): string {
  const body = asErrorShape(error).response?.data;
  const nested = typeof body?.error === 'object' ? body.error.message : undefined;
  const candidates = [
    nested,
    typeof body?.error === 'string' ? body.error : undefined,
    body?.message,
  ];
  const found = candidates.find((c): c is string => typeof c === 'string' && c.length > 0);
  if (found !== undefined) {
    return found;
  }
  return error instanceof Error ? error.message : 'unknown error';
}

/**
 * Whether a provider refused THIS model for audio specifically — a
 * model-catalog mismatch — rather than a transport failure, auth problem or
 * genuine outage. Only this class of rejection is recoverable by falling
 * through to the next candidate in `TRANSCRIPTION_PROVIDER_PRIORITY`;
 * anything else (429, 500, network error, a bad recording) must still fail.
 */
export function isAudioModalityRejection(error: unknown): boolean {
  const detail = extractTranscriptionErrorMessage(error).toLowerCase();
  return TRANSCRIPTION_MODALITY_REJECTION_MARKERS.some((marker) => detail.includes(marker));
}

/** OpenAI's `insufficient_quota`, in `error.code` or `error.type`. */
function isQuotaExhausted(error: unknown): boolean {
  const body = asErrorShape(error).response?.data?.error;
  if (typeof body !== 'object') {
    return false;
  }
  const markers = [body.code, body.type].filter(
    (value): value is string => typeof value === 'string',
  );
  return markers.some((marker) => TRANSCRIPTION_QUOTA_EXHAUSTED_CODES.includes(marker));
}

/**
 * A 200 that carried no usable transcript. Empty and reasoning-only answers
 * earn the one same-model retry; a MAX_TOKENS cut-off moves to the next
 * candidate (the same ceiling would cut again); a content-policy block is
 * terminal (another model under the same policy would block again).
 */
function classifyResponseIssue(issue: TranscriptionResponseIssue): TranscriptionFailureKind {
  switch (issue) {
    case TranscriptionResponseIssue.EMPTY:
    case TranscriptionResponseIssue.THOUGHT_ONLY:
      return TranscriptionFailureKind.EMPTY_RESPONSE;
    case TranscriptionResponseIssue.TRUNCATED:
      return TranscriptionFailureKind.INCOMPLETE_RESPONSE;
    case TranscriptionResponseIssue.BLOCKED:
      return TranscriptionFailureKind.TERMINAL;
  }
}

/**
 * Which class of failure one provider call ended in — the input to the
 * candidate walk's "may I call again, and where?" decision. Reads the typed
 * response issue for a 200 that was not a transcript, otherwise the HTTP
 * status and the provider's own body, never the axios transport message.
 */
export function classifyTranscriptionFailure(error: unknown): TranscriptionFailureKind {
  if (error instanceof TranscriptionResponseError) {
    return classifyResponseIssue(error.issue);
  }
  const status = asErrorShape(error).response?.status;
  if (status === TRANSCRIPTION_HTTP_STATUS_TOO_MANY_REQUESTS) {
    return isQuotaExhausted(error)
      ? TranscriptionFailureKind.QUOTA_EXHAUSTED
      : TranscriptionFailureKind.RATE_LIMITED;
  }
  const isModelRejection =
    status === TRANSCRIPTION_HTTP_STATUS_NOT_FOUND || isAudioModalityRejection(error);
  return isModelRejection
    ? TranscriptionFailureKind.MODEL_REJECTED
    : TranscriptionFailureKind.TERMINAL;
}
