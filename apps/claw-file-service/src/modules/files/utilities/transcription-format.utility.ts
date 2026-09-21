import { GEMINI_OPENAI_COMPAT_SUFFIX } from '../constants/transcription.constants';

/**
 * connector-service stores Gemini's base URL as the OpenAI-COMPATIBLE endpoint
 * (`https://…/v1beta/openai`) because that is what chat execution speaks. The
 * `:generateContent` route that accepts `inline_data` is the NATIVE API one
 * level up, so the compat suffix is stripped here rather than changed in the
 * connector config — changing it there would break every existing chat call.
 */
export function toGeminiNativeBaseUrl(baseUrl: string): string {
  const trimmed = baseUrl.replace(/\/+$/, '');
  return trimmed.endsWith(GEMINI_OPENAI_COMPAT_SUFFIX)
    ? trimmed.slice(0, -GEMINI_OPENAI_COMPAT_SUFFIX.length)
    : trimmed;
}

/**
 * A filename is required by OpenAI's multipart transcription API and its
 * extension is what picks the demuxer, so `audio/ogg` must not arrive as
 * `audio.mp3`. Parameters (`audio/webm;codecs=opus`) are dropped and anything
 * non-alphanumeric is stripped, because the value comes from an upload header.
 */
export function audioFilenameForMimeType(mimeType: string): string {
  const subtype = mimeType.split('/')[1] ?? 'mpeg';
  const withoutParameters = subtype.split(';')[0] ?? 'mpeg';
  const extension = withoutParameters.replaceAll(/[^a-z0-9]/gi, '') || 'mp3';
  return `audio.${extension.toLowerCase()}`;
}

/** Trims the trailing slashes an operator-typed base URL often carries. */
export function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, '');
}
