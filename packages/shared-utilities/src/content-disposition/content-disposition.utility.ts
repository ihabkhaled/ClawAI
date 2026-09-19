import {
  ASCII_FALLBACK_BASE,
  ASCII_FILENAME_UNSAFE,
  COMBINING_MARKS,
  RFC5987_EXTRA_ESCAPES,
} from './content-disposition.constants';
import type { ContentDispositionType } from './content-disposition-type.enum';

/** A printable-ASCII stand-in for `filename`, keeping the extension. */
export function asciiFallbackFilename(filename: string): string {
  const cleaned = filename
    .normalize('NFKD')
    .replace(COMBINING_MARKS, '')
    .replace(ASCII_FILENAME_UNSAFE, '-')
    .replaceAll(/-{2,}/gu, '-')
    .trim();
  const dot = cleaned.lastIndexOf('.');
  const base = dot > 0 ? cleaned.slice(0, dot) : cleaned;
  const extension = dot > 0 ? cleaned.slice(dot) : '';
  return /[A-Za-z0-9]/u.test(base) ? cleaned : `${ASCII_FALLBACK_BASE}${extension}`;
}

/**
 * A `Content-Disposition` value any filename can go into. Browsers read
 * `filename*` (RFC 5987, UTF-8), so an Arabic, Chinese or "Wi‑Fi" title stays
 * as written; `filename` is a printable-ASCII fallback. Writing the raw name
 * into `filename="…"` threw ERR_INVALID_CHAR for anything above U+00FF, and
 * the download came back as a 500.
 */
export function contentDispositionHeader(type: ContentDispositionType, filename: string): string {
  const encoded = encodeURIComponent(filename).replace(
    RFC5987_EXTRA_ESCAPES,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  return `${type}; filename="${asciiFallbackFilename(filename)}"; filename*=UTF-8''${encoded}`;
}
