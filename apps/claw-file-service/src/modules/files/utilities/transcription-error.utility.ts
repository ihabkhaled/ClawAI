import { TRANSCRIPTION_MODALITY_REJECTION_MARKERS } from '../constants/transcription.constants';
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
