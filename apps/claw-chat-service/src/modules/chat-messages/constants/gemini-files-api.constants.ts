// Gemini Files API + native generateContent constants. See
// https://ai.google.dev/api/rest/v1beta/files (upload endpoint) and
// https://ai.google.dev/api/rest/v1beta/models/generateContent.
//
// The Files API upload endpoint speaks a resumable upload protocol; we issue a
// single-shot raw upload here (start + upload in one request) because the
// payloads we hand it (< ~50 MB after the inline threshold check) easily fit
// in one POST.

import { DATA_URL_BASE64_PATTERN as SHARED_DATA_URL_BASE64_PATTERN } from './anthropic-message-shape.constants';

export const GEMINI_FILES_API_BASE_URL =
  'https://generativelanguage.googleapis.com/upload/v1beta/files';

export const GEMINI_GENERATE_CONTENT_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

// Reference inline limit. The actual operational threshold comes from
// AppConfig.GEMINI_FILES_API_SIZE_THRESHOLD_BYTES (default 20 MB); this
// constant exists so a reader can find the Google-documented hard ceiling
// (Files API is mandatory above ~20 MB on the inline path).
export const GEMINI_INLINE_DATA_LIMIT_BYTES = 20_000_000;

// Half-life of a Files API entry on Google's side is 48h. We cache the URI
// for 24h (default) — see AppConfig.GEMINI_FILES_API_TTL_MINUTES.
export const GEMINI_FILES_API_DEFAULT_TTL_MINUTES = 1440;

// Reused from the Anthropic constants so we keep ONE definition of the OpenAI
// `image_url` data URL regex across the codebase.
export const DATA_URL_BASE64_PATTERN = SHARED_DATA_URL_BASE64_PATTERN;

// Discriminator + role helpers for the native Gemini content shape.
export const GEMINI_ROLE_USER = 'user';
export const GEMINI_ROLE_MODEL = 'model';
export const GEMINI_ROLE_SYSTEM = 'system';

// Default mime type fallback when the OpenAI image_url data URL is missing
// the `<mime>` segment. Gemini rejects parts without a mime type, so we use
// a generic binary fallback that the model can still inspect.
export const GEMINI_DEFAULT_BINARY_MIME_TYPE = 'application/octet-stream';

// Common Gemini Files API errors. Surfaced to callers so they can decide
// whether to fall back to inline_data.
export const GEMINI_FILES_API_RATE_LIMITED_STATUS = 429;
export const GEMINI_FILES_API_QUOTA_EXCEEDED_STATUS = 403;
