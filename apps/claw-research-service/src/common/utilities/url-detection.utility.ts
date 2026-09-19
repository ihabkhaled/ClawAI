import { detectUrlsInText as detectWrittenUrls } from '@claw/shared-utilities';

import {
  DIRECT_FETCH_MAX_URLS,
  UNSAFE_URL_SCHEMES,
  URL_MAX_LENGTH,
} from '../constants/url-detection.constants';

/**
 * URLs the user actually wrote, in the order they wrote them.
 *
 * This is the missing first step of "read this page": until it existed, a
 * pasted link reached the search engine as a keyword and the page was opened
 * only by luck. See `url-detection.constants.ts` for why.
 *
 * Detection is the shared `detectUrlsInText`, which also catches a link written
 * without a scheme (`example.com/pricing`, `www.site.org`). It used to require
 * `http(s)://`, on the reasoning that a bare domain is a search term — but that
 * is not how people write links, and chat-service now sends the same message
 * with the same expectation, so both services must agree on what a URL is or a
 * page chat-service decided to crawl arrives here as "no URL in the message".
 *
 * Still conservative about what it RETURNS: everything returned is fetched, so
 * each candidate must also pass isFetchableUrl.
 */
export function detectUrlsInText(text: string): string[] {
  if (text.length === 0) {
    return [];
  }
  const urls: string[] = [];
  for (const candidate of detectWrittenUrls(text)) {
    if (!isFetchableUrl(candidate)) {
      continue;
    }
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
