import { type OpenAiAudioFlagResolution } from '../types/media-capability.types';

/**
 * Media INPUT capability heuristics for OpenAI models — vision and audio.
 *
 * OpenAI's `GET /models` returns only `id`/`object`/`created`/`owned_by`, so
 * there is no live modality signal to sync. Capability is therefore decided
 * by model id, and like `gemini-audio-heuristics.constants.ts` every rule
 * here FAILS CLOSED: an id that matches no known family is `false`. A false
 * negative costs a user a "this model cannot see images" hint and a pick of a
 * different model; a false positive posts an image or a recording to an
 * endpoint that refuses it and shows the user a garbled provider error.
 *
 * The bug this replaces: the adapter used
 * `id.includes('vision') || id.startsWith('gpt-4')`, which marked every
 * `gpt-5*`, `o1`, `o3` and `o4-mini` model as text-only (they all accept
 * images) and every `gpt-4o-transcribe` / `gpt-4o-mini-tts` /
 * `gpt-4o-realtime-preview` row as vision-capable (none of them is).
 *
 * Segment matching, not regex: ids are split on `-` and compared token by
 * token, which is provably linear and matches the Gemini heuristic's style.
 */

/**
 * Any of these segments anywhere in the id means the model is a special-purpose
 * deployment (speech, realtime websocket, search, TTS, image generation,
 * completions-only), not a general chat model that takes image input.
 */
export const OPENAI_NON_VISION_SEGMENTS: readonly string[] = [
  'audio',
  'realtime',
  'search',
  'transcribe',
  'tts',
  'instruct',
  'image',
  'embedding',
];

/**
 * `gpt-<second segment>` families that accept image input. `5` is handled
 * separately so every `gpt-5`, `gpt-5.1`, `gpt-5.2` … point release matches.
 */
export const OPENAI_VISION_GPT_FAMILIES: readonly string[] = ['4o', '4.1', '4.5'];

/** `gpt-4-<third segment>` variants that accept image input. */
export const OPENAI_VISION_GPT4_VARIANTS: readonly string[] = ['turbo', 'vision'];

/**
 * Reasoning families: the SECOND segment decides. Absent (`o1`), a date
 * (`o1-2024-12-17`), or one of the listed qualifiers means vision; anything
 * else — notably `o1-mini`, `o1-preview`, `o3-mini` — is text-only.
 */
export const OPENAI_VISION_REASONING_QUALIFIERS: ReadonlyMap<string, readonly string[]> = new Map<
  string,
  readonly string[]
>([
  ['o1', ['pro']],
  ['o3', ['pro', 'deep']],
]);

/** `o4` has no bare model; only `o4-mini` (and its dated/deep-research pins) sees images. */
export const OPENAI_VISION_O4_QUALIFIERS: readonly string[] = ['mini'];

/** Major version of the `gpt-5` line; `gpt-6` is unknown and therefore false. */
export const OPENAI_VISION_GPT5_MAJOR = '5';

/**
 * Segments marking an OpenAI model that accepts audio INPUT over the plain
 * HTTP API: `gpt-4o-audio-preview`, `gpt-4o-mini-audio-preview`,
 * `gpt-4o-transcribe`, `gpt-4o-mini-transcribe`. `realtime` is deliberately
 * absent — it is websocket-only and nothing in ClawAI speaks that protocol.
 * `tts` is output-only.
 */
export const OPENAI_AUDIO_INPUT_SEGMENTS: readonly string[] = ['audio', 'transcribe'];

const DIGITS = '0123456789';

function isDigitsOnly(token: string): boolean {
  return token.length > 0 && [...token].every((char) => DIGITS.includes(char));
}

function isGpt5Version(token: string): boolean {
  const parts = token.split('.');
  return parts.length <= 2 && parts[0] === OPENAI_VISION_GPT5_MAJOR && parts.every(isDigitsOnly);
}

function isGptVisionFamily(segments: readonly string[]): boolean {
  const [, family, variant, ...rest] = segments;
  if (family === undefined) return false;
  if (OPENAI_VISION_GPT_FAMILIES.includes(family) || isGpt5Version(family)) return true;
  if (family !== '4' || variant === undefined) return false;
  // `gpt-4-turbo-preview` (the 0125 text-only model) is NOT the vision turbo.
  return variant === 'turbo'
    ? !rest.includes('preview')
    : OPENAI_VISION_GPT4_VARIANTS.includes(variant);
}

function isReasoningVisionFamily(segments: readonly string[]): boolean {
  const [family, qualifier] = segments;
  if (family === 'o4') {
    return qualifier !== undefined && OPENAI_VISION_O4_QUALIFIERS.includes(qualifier);
  }
  const allowed = family === undefined ? undefined : OPENAI_VISION_REASONING_QUALIFIERS.get(family);
  return allowed === undefined
    ? false
    : qualifier === undefined || isDigitsOnly(qualifier) || allowed.includes(qualifier);
}

/** True only for OpenAI chat models confirmed to accept image input. */
export function isOpenAiVisionCapableModel(modelId: string): boolean {
  const segments = modelId.toLowerCase().split('-');
  if (segments.some((segment) => OPENAI_NON_VISION_SEGMENTS.includes(segment))) {
    return false;
  }
  const [product, family] = segments;
  if (product === 'gpt') return isGptVisionFamily(segments);
  return product === 'chatgpt' ? family === '4o' : isReasoningVisionFamily(segments);
}

/** True only for OpenAI models that accept audio input over the HTTP API. */
export function isOpenAiAudioInputModel(modelId: string): boolean {
  const segments = modelId.toLowerCase().split('-');
  return segments.some((segment) => OPENAI_AUDIO_INPUT_SEGMENTS.includes(segment));
}

/**
 * Per-model `supportsAudio` for a whole OpenAI listing.
 *
 * `supportsAudio` on a connector row means "this connector can serve
 * speech-to-text / audio input for this model". file-service's
 * `TranscriptionCapabilityClient` picks ONE audio-flagged row per provider
 * only as proof that OpenAI is configured, then calls `whisper-1` regardless.
 * The standard `api.openai.com` listing always contains the `-transcribe` /
 * `-audio-preview` models, so per-model flags keep that fallback alive.
 *
 * Provider-level fallback: a listing with NO audio-input model at all (a
 * trimmed proxy behind a custom base URL, a restricted project key) would
 * leave OpenAI with zero audio rows and silently drop it from transcription,
 * although its credentials can still reach `/audio/transcriptions`. For that
 * case only, every row keeps the historical provider-level `true`. The caller
 * logs when the fallback fires.
 */
export function resolveOpenAiAudioFlags(modelIds: readonly string[]): OpenAiAudioFlagResolution {
  const perModel = modelIds.map((id) => [id, isOpenAiAudioInputModel(id)] as const);
  const anyAudio = perModel.some(([, capable]) => capable);
  const flags = new Map<string, boolean>(
    perModel.map(([id, capable]) => [id, anyAudio ? capable : true]),
  );
  return { flags, usedProviderFallback: !anyAudio && modelIds.length > 0 };
}
