import {
  DIRECT_FETCH_MAX_URLS,
  HTTP_URL_PATTERN,
  UNSAFE_URL_SCHEMES,
  URL_MAX_LENGTH,
  URL_TRAILING_PUNCTUATION,
} from '../constants/url-detection.constants';

/**
 * URLs the user actually wrote, in the order they wrote them.
 *
 * This is the missing first step of "read this page": until it existed, a
 * pasted link reached the search engine as a keyword and the page was opened
 * only by luck. See `url-detection.constants.ts` for why.
 *
 * It is deliberately conservative. Anything it returns will be fetched, so it
 * returns only what it is sure about: an absolute `http`/`https` URL that the
 * platform's own `URL` parser accepts. Everything else is left to search, which
 * is the safe default rather than the lossy one.
 */
export function detectUrlsInText(text: string): string[] {
  if (text.length === 0) {
    return [];
  }
  // The pattern is /g, and a /g regex carries lastIndex across calls. Matching
  // through `matchAll` on a fresh clone avoids the classic bug where every
  // second call silently starts halfway through the string.
  const pattern = new RegExp(HTTP_URL_PATTERN.source, HTTP_URL_PATTERN.flags);
  const seen = new Set<string>();
  const urls: string[] = [];

  for (const match of text.matchAll(pattern)) {
    const candidate = trimTrailingPunctuation(match[0]);
    if (!isFetchableUrl(candidate)) {
      continue;
    }
    // Case-sensitively deduped: two spellings of the same host are the same
    // page, but a path is case-significant on most servers.
    const key = candidate.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    urls.push(candidate);
    if (urls.length >= DIRECT_FETCH_MAX_URLS) {
      break;
    }
  }
  return urls;
}

/** Whether the text contains at least one fetchable URL. */
export function hasFetchableUrl(text: string): boolean {
  return detectUrlsInText(text).length > 0;
}

function trimTrailingPunctuation(raw: string): string {
  let value = raw;
  while (value.length > 0) {
    const last = value.slice(-1);
    if (!URL_TRAILING_PUNCTUATION.includes(last)) {
      break;
    }
    value = value.slice(0, -1);
  }
  return value;
}

function isFetchableUrl(candidate: string): boolean {
  if (candidate.length === 0 || candidate.length > URL_MAX_LENGTH) {
    return false;
  }
  const lowered = candidate.toLowerCase();
  if (UNSAFE_URL_SCHEMES.some((scheme) => lowered.startsWith(scheme))) {
    return false;
  }
  try {
    const parsed = new URL(candidate);
    // The pattern already requires http(s), but parsing can normalise a match
    // into something else; check the result rather than the input.
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}
