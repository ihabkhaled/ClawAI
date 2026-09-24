/**
 * Heuristic for whether a Gemini model accepts native VIDEO input.
 *
 * Same situation as `gemini-audio-heuristics.constants.ts`: neither Gemini's
 * OpenAI-compatible `GET /models` nor the native `GET /v1beta/models` carries
 * an input-modality list, so there is no live signal to sync. The rule is by
 * model id and FAILS CLOSED — anything outside the confirmed family is false.
 *
 * Accepted: `gemini-<major>[.<minor>]-{flash,pro}` with major >= 2
 * (`gemini-2.0-flash`, `gemini-2.5-flash`, `gemini-2.5-pro`, `gemini-3-pro`,
 * `gemini-3-flash` …), optionally followed by `-lite`, `-preview` and numeric
 * date pins (`gemini-2.5-flash-preview-09-2025`, `gemini-3-pro-preview`).
 * The Gemini 3 line ships as `-preview` first, which is why `preview` is an
 * allowed suffix here while the audio heuristic still refuses it.
 *
 * Refused by construction: every suffix outside that set — `-image`
 * (image-generation), `-tts`, `-live`, `-native-audio`, `-exp`, `-thinking`,
 * `-computer-use` — and every non-`gemini` product line (Gemma, Imagen,
 * `text-embedding-*`, `antigravity-*`). Gemini 1.x is refused: retired, and
 * nothing in this deployment should route video to it.
 *
 * The catalog keys Gemini rows with a `models/` prefix; it is stripped exactly
 * as the audio heuristic does (rules/42 item 13 — a bare-keyed set that never
 * matched `models/gemini-2.5-flash` is the bug class this avoids).
 */
export const GEMINI_VIDEO_FAMILY_NAMES: readonly string[] = ['flash', 'pro'];

/** Non-numeric suffix segments allowed after the family name. */
export const GEMINI_VIDEO_ALLOWED_SUFFIXES: readonly string[] = ['lite', 'preview'];

/** Lowest major version with confirmed native video input in this deployment. */
export const GEMINI_VIDEO_MIN_MAJOR_VERSION = 2;

export const GEMINI_MODEL_ID_PREFIX = 'models/';

const DIGITS = '0123456789';

function isDigitsOnly(token: string): boolean {
  return token.length > 0 && [...token].every((char) => DIGITS.includes(char));
}

function isSupportedVersion(token: string): boolean {
  const parts = token.split('.');
  return parts.length <= 2 && parts.every(isDigitsOnly)
    ? Number(parts[0]) >= GEMINI_VIDEO_MIN_MAJOR_VERSION
    : false;
}

function isAllowedSuffix(segments: readonly string[]): boolean {
  return segments.every(
    (segment) => isDigitsOnly(segment) || GEMINI_VIDEO_ALLOWED_SUFFIXES.includes(segment),
  );
}

export function isGeminiVideoCapableModel(modelId: string): boolean {
  const lower = modelId.toLowerCase();
  const withoutPrefix = lower.startsWith(GEMINI_MODEL_ID_PREFIX)
    ? lower.slice(GEMINI_MODEL_ID_PREFIX.length)
    : lower;
  const [product, version, family, ...suffix] = withoutPrefix.split('-');

  if (product !== 'gemini' || version === undefined || family === undefined) {
    return false;
  }
  const isKnownFamily = isSupportedVersion(version) && GEMINI_VIDEO_FAMILY_NAMES.includes(family);
  return isKnownFamily ? isAllowedSuffix(suffix) : false;
}
