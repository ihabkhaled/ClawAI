import { PROVIDER_ERROR_RESPONSE_SCAN_CHARACTERS } from '../constants/provider-error-response.constants';

/**
 * Detects a provider "answer" that is really an error.
 *
 * Providers do not reliably signal failure with a transport status. Gemini
 * returned HTTP 200 whose body was
 * `[{ "error": { "code": 429, "status": "RESOURCE_EXHAUSTED", ... } }]`, the
 * chain treated it as a completed answer, and the raw JSON — billing URL and
 * all — was stored and rendered as the assistant's reply. Nothing failed, so
 * nothing fell through to the next model even though other providers were
 * reachable.
 *
 * Detection is deliberately NARROW. A first attempt matched any JSON mentioning
 * an error and would have thrown away real answers: a validation reply such as
 * `{"valid": false, "error": "email is required"}` is a legitimate result, and
 * discarding it would burn the whole fallback chain and charge the user for
 * every provider. So a body only counts as an error envelope when its ONLY
 * top-level content is an error object — the exact shape providers emit, and a
 * shape an answer almost never takes.
 */
function parseJsonPrefix(candidate: string): unknown {
  const trimmed = candidate.trimStart();
  // An error envelope is a JSON document. Prose that merely discusses an error
  // must never be discarded, so anything not starting as JSON is an answer.
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
    return undefined;
  }
  // An error body is small; a real answer can be huge. Bounding the parse keeps
  // this O(1) on large replies.
  if (trimmed.length > PROVIDER_ERROR_RESPONSE_SCAN_CHARACTERS) {
    return undefined;
  }
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return undefined;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * True when the object carries an error and nothing else worth reading.
 *
 * The single-key requirement is what separates a provider envelope from an
 * answer that happens to include an `error` field.
 */
function isErrorOnlyObject(value: unknown): boolean {
  if (!isRecord(value)) return false;
  const keys = Object.keys(value);
  if (keys.length !== 1 || keys[0] !== 'error') return false;
  const detail = value['error'];
  // `{"error": "something"}` and `{"error": {code, message, status}}` both occur.
  return typeof detail === 'string' || isRecord(detail);
}

export function isProviderErrorResponse(content?: string | null): boolean {
  if (content === undefined || content === null) {
    return true;
  }
  if (content.trim().length === 0) {
    return true;
  }
  const document = parseJsonPrefix(content);
  if (document === undefined) {
    return false;
  }
  // Gemini wraps its envelope in a single-element array.
  if (Array.isArray(document)) {
    return document.length === 1 && isErrorOnlyObject(document[0]);
  }
  return isErrorOnlyObject(document);
}

/**
 * A short, safe reason for the attempt log.
 *
 * The provider's own text is never reused: it is unbounded and has carried
 * billing URLs and account identifiers into places a user can read.
 */
export function describeProviderErrorResponse(content?: string | null): string {
  if (content === undefined || content === null || content.trim().length === 0) {
    return 'Provider returned an empty response';
  }
  return 'Provider returned an error payload instead of an answer';
}
