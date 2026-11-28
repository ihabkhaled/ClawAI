import {
  PLATFORM_FIELD_MAX_CHARS,
  PLATFORM_HTML_ENTITIES,
  PLATFORM_SNIPPET_MAX_CHARS,
} from '../constants/platform-api.constants';

/**
 * Plain text from an API field that may carry HTML or JATS markup (Crossref
 * abstracts, Wikipedia `searchmatch` spans, Stack Exchange titles). Bounded:
 * the field is cut to `PLATFORM_FIELD_MAX_CHARS` before any scan, tags are
 * removed with a linear pattern, common entities decoded, whitespace
 * collapsed, and the result capped at `maxChars`. Null for an empty field.
 */
export function plainTextOf(
  raw: unknown,
  maxChars: number = PLATFORM_SNIPPET_MAX_CHARS,
): string | null {
  if (typeof raw !== 'string' || raw.length === 0) {
    return null;
  }
  const untagged = raw.slice(0, PLATFORM_FIELD_MAX_CHARS).replaceAll(/<[^<>]*>/gu, ' ');
  const decoded = untagged.replaceAll(
    /&(?:#\d{1,6}|#x[\da-f]{1,6}|[a-z]{2,8});/giu,
    (entity) => PLATFORM_HTML_ENTITIES.get(entity.toLowerCase()) ?? decodeNumericEntity(entity),
  );
  const text = decoded.replaceAll(/\s+/gu, ' ').trim();
  if (text.length === 0) {
    return null;
  }
  return text.length > maxChars ? `${text.slice(0, maxChars)}…` : text;
}

function decodeNumericEntity(entity: string): string {
  const hex = /^&#x([\da-f]+);$/iu.exec(entity)?.[1];
  const dec = /^&#(\d+);$/u.exec(entity)?.[1];
  let code = Number.NaN;
  if (hex !== undefined) {
    code = Number.parseInt(hex, 16);
  } else if (dec !== undefined) {
    code = Number.parseInt(dec, 10);
  }
  return Number.isInteger(code) && code > 0 && code <= 0x10ffff
    ? String.fromCodePoint(code)
    : entity;
}

/** A short label from a list of present parts: `Nature · 2021`. Empty parts are dropped. */
export function joinParts(parts: ReadonlyArray<string | null | undefined>): string | null {
  const kept = parts.filter((part): part is string => typeof part === 'string' && part.length > 0);
  return kept.length === 0 ? null : kept.join(' · ');
}

/** `YYYY-MM-DD` from `[year, month?, day?]` (Crossref date-parts); null without a year. */
export function isoDateFromParts(parts: readonly number[] | undefined): string | null {
  const [year, month, day] = parts ?? [];
  if (year === undefined || !Number.isInteger(year)) {
    return null;
  }
  const pad = (value: number | undefined): string =>
    value === undefined ? '01' : String(value).padStart(2, '0');
  return `${String(year)}-${pad(month)}-${pad(day)}`;
}

/** ISO string from unix seconds (Stack Exchange); null when absent or invalid. */
export function isoFromUnixSeconds(seconds: unknown): string | null {
  return typeof seconds === 'number' && Number.isFinite(seconds) && seconds > 0
    ? new Date(seconds * 1000).toISOString()
    : null;
}

/** An absolute http(s) URL from an API field, normalised; null for anything else. */
export function httpUrlOrNull(value: unknown): string | null {
  if (typeof value !== 'string' || value.length === 0 || value.length > 2048) {
    return null;
  }
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
  } catch {
    return null;
  }
}

/** Parsed JSON body; a malformed body is an error naming the API, never a crash elsewhere. */
export function parsePlatformJson<T>(body: string, label: string): T {
  try {
    return JSON.parse(body) as T;
  } catch {
    throw new Error(`${label} API returned malformed JSON`);
  }
}

/** The string, or null when the API sent anything else. */
export function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}
