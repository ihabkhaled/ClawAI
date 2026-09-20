import {
  BARE_HOST_KNOWN_NON_URLS,
  BARE_HOST_PATTERN,
  BARE_HOST_TLDS,
  BARE_HOST_TLDS_NEEDING_PATH,
  DETECT_URLS_DEFAULT_MAX,
  EXPLICIT_URL_PATTERN,
  TRAILING_URL_PUNCTUATION_CHARS,
} from './url-detection.constants';
import type { DetectUrlsOptions } from './url-detection.types';

/**
 * Every web URL a person wrote in a message, normalized to an absolute
 * `https://` form, in the order they appear.
 *
 * Catches both `https://example.com/x` and the way people actually type a
 * link: `example.com/pricing`, `www.site.org`, `docs.stripe.com`. Until this
 * existed, four separate regexes across chat-service and research-service all
 * required `http(s)://`, so a message that said "summarise example.com" was
 * answered from training data with no page ever opened.
 *
 * This is DETECTION, not a safety check. Whether a URL may be fetched —
 * private hosts, cloud metadata, the domain allowlist — stays the fetch
 * guard's decision. A detected `claw.local` is supposed to reach that guard
 * and be refused by name, not vanish here.
 */
export function detectUrlsInText(text: string, options: DetectUrlsOptions = {}): string[] {
  const max = options.max ?? DETECT_URLS_DEFAULT_MAX;
  const found: Array<{ index: number; url: string }> = [];
  const coveredRanges: Array<[number, number]> = [];

  for (const match of text.matchAll(EXPLICIT_URL_PATTERN)) {
    const normalized = normalizeHttpUrl(stripTrailingPunctuation(match[0]));
    const start = match.index;
    coveredRanges.push([start, start + match[0].length]);
    if (normalized !== null) {
      found.push({ index: start, url: normalized });
    }
  }

  for (const match of text.matchAll(BARE_HOST_PATTERN)) {
    const start = match.index;
    // Inside an explicit URL already handled above.
    if (coveredRanges.some(([from, to]) => start >= from && start < to)) {
      continue;
    }
    const host = (match[1] ?? '').toLowerCase();
    const tld = (match[2] ?? '').toLowerCase();
    const path = match[3] ?? '';
    if (!isPlausibleBareHost(host, tld, path, host.startsWith('www.'))) {
      continue;
    }
    const normalized = normalizeHttpUrl(`https://${stripTrailingPunctuation(match[0])}`);
    if (normalized !== null) {
      found.push({ index: start, url: normalized });
    }
  }

  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const { url } of found.sort((left, right) => left.index - right.index)) {
    if (seen.has(url)) {
      continue;
    }
    seen.add(url);
    ordered.push(url);
    if (ordered.length >= max) {
      break;
    }
  }
  return ordered;
}

function isPlausibleBareHost(host: string, tld: string, path: string, hasWww: boolean): boolean {
  if (BARE_HOST_KNOWN_NON_URLS.has(host)) {
    return false;
  }
  if (BARE_HOST_TLDS.has(tld)) {
    return true;
  }
  // `vercel.app/docs` is a site; `this.app` is a property. Only the path or a
  // `www.` tells them apart.
  return BARE_HOST_TLDS_NEEDING_PATH.has(tld) && (path.length > 1 || hasWww);
}

/**
 * http/https only, and never a URL carrying credentials. These come from an
 * untrusted prompt and are about to be fetched by the server.
 */
function normalizeHttpUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return null;
    }
    if (url.username !== '' || url.password !== '') {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

/**
 * Drops the punctuation a sentence leaves on the end of a pasted URL.
 *
 * A reverse scan, not a regex. `/[.,;:!?)\]}'"]+$/` is a polynomial-ReDoS
 * pattern on input nobody controls but the sender: a chat message of many
 * repeated `!` makes the engine retry the match from every position, which is
 * quadratic (CodeQL js/polynomial-redos, alert #59). Walking backwards once is
 * linear and cannot backtrack. The same fix is already in the entitlements
 * adapter for trailing slashes.
 */
function stripTrailingPunctuation(value: string): string {
  let end = value.length;
  while (end > 0 && TRAILING_URL_PUNCTUATION_CHARS.has(value.charAt(end - 1))) {
    end -= 1;
  }
  return value.slice(0, end);
}
