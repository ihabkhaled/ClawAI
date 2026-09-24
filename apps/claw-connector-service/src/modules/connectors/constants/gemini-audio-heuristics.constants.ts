/**
 * Heuristic for whether a Gemini model actually accepts audio input.
 *
 * Root cause of the live bug this guards against: `syncModels` used to write
 * `supportsAudio: true` for EVERY row it read from Gemini's OpenAI-compatible
 * `GET /models` list. That endpoint's entries carry only `id`/`object`/
 * `created`/`owned_by` (see `GeminiModelEntry`) — no modality data at all — so
 * the flag was never really "synced from Gemini", it was a blanket default
 * applied to the whole provider. `fetchNativeContextWindows` proves Google's
 * native `GET /v1beta/models` is reachable, but even that endpoint reports
 * only token limits and generation methods, never an audio-input boolean, so
 * there is no live signal to sync `supportsAudio` from either.
 *
 * This bit `models/antigravity-preview-05-2026`: Gemini answers 400
 * "Audio input modality is not enabled for models/antigravity-preview-05-2026"
 * for it, but the blanket default marked it capable, and
 * `TRANSCRIPTION_PROVIDER_PRIORITY` picks the first GEMINI row that claims
 * `supportsAudio`, so every automatic transcription hit that model first and
 * failed. It is not one bad row — ANY future preview/experimental Gemini
 * model, or a whole new non-`gemini-*` product line the catalog has never
 * seen, gets the same wrong default under the old code.
 *
 * With no reliable capability signal, this fails closed (same philosophy as
 * `TranscriptionCapabilityClient`'s own doc comment: guessing capability
 * wrong means posting audio to an endpoint that refuses it and a user reading
 * a garbled failure instead of a clean "not supported"). Only the canonical,
 * numbered `gemini-<major>[.<minor>]-{flash,pro}[-lite]` family — the stable,
 * generally-available line that has shipped audio input for years — is
 * treated as audio-capable. Preview, experimental, thinking and live-dialog
 * variants, and any non-`gemini` product line (Gemma, Imagen, embeddings,
 * and whatever ships next, like `antigravity`), default to `false` until
 * someone confirms the real capability and widens the pattern.
 *
 * Deliberately no regex for the family match: a hand-rolled character/segment
 * walk is what rules/12's neighbouring precedent
 * (`MODEL_VERSION_DIGITS` in the frontend's `model-recency.constants.ts`)
 * uses for the same reason — a security linter cannot prove a `\d+` group is
 * safe from catastrophic backtracking, and splitting on `-`/`.` and checking
 * digits is exactly as correct and trivially provably linear.
 */
const GEMINI_AUDIO_UNSAFE_MARKERS: readonly string[] = [
  'preview',
  'exp',
  'experimental',
  'thinking',
  'live',
];

const GEMINI_AUDIO_FAMILY_NAMES: readonly string[] = ['flash', 'pro'];

const DIGITS = '0123456789';

function isDigitsOnly(token: string): boolean {
  return token.length > 0 && [...token].every((char) => DIGITS.includes(char));
}

/** `2`, `2.5`, `3.6` — digits, optionally one dot group. Never `2.5.1`. */
function isVersionToken(token: string): boolean {
  const parts = token.split('.');
  return parts.length <= 2 && parts.every((part) => isDigitsOnly(part));
}

/**
 * `[]` (bare `gemini-2.5-flash`), `['lite']`, `['lite', '001']` or `['001']`
 * — anything past the family name must be the `-lite` variant marker and/or
 * a trailing numeric pin, never free text.
 */
function isKnownSuffix(segments: readonly string[]): boolean {
  return segments.every((segment, index) =>
    index === 0 && segment === 'lite' ? true : isDigitsOnly(segment),
  );
}

export function isGeminiAudioCapableModel(modelId: string): boolean {
  const lower = modelId.toLowerCase();
  if (GEMINI_AUDIO_UNSAFE_MARKERS.some((marker) => lower.includes(marker))) {
    return false;
  }

  const withoutPrefix = lower.startsWith('models/') ? lower.slice('models/'.length) : lower;
  const [product, version, family, ...suffix] = withoutPrefix.split('-');

  if (product !== 'gemini' || version === undefined || family === undefined) {
    return false;
  }
  const isKnownFamily = isVersionToken(version) && GEMINI_AUDIO_FAMILY_NAMES.includes(family);
  return isKnownFamily ? isKnownSuffix(suffix) : false;
}
