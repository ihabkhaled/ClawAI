import {
  ALLOWED_AUTH_HEADERS,
  CUSTOM_AUTH_HEADER_PATTERN,
  DENIED_AUTH_HEADER_PREFIXES,
  DENIED_AUTH_HEADERS,
} from '../constants/catalog.constants';

/** A credential may only travel in an allow-listed header; hop-by-hop and identity headers never. */
export function isAllowedAuthHeader(name: string): boolean {
  const lower = name.toLowerCase();
  if (DENIED_AUTH_HEADERS.includes(lower)) return false;
  return DENIED_AUTH_HEADER_PREFIXES.some((prefix) => lower.startsWith(prefix))
    ? false
    : ALLOWED_AUTH_HEADERS.includes(lower) || CUSTOM_AUTH_HEADER_PATTERN.test(name);
}
