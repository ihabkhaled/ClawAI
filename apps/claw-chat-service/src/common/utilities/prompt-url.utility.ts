import { PROMPT_URL_MAX_PER_MESSAGE, PROMPT_URL_PATTERN } from '../constants/prompt-url.constants';

/**
 * Absolute http(s) URLs a user put in their message.
 *
 * Separate from research entirely. A pasted link is not a search request — it
 * is the user pointing at a specific page and expecting it to be read. That is
 * true whether research is on, off, or automatic, which is why crawling keys
 * off this and not off ResearchMode.
 *
 * EVERY url found is returned, up to PROMPT_URL_MAX_PER_MESSAGE. The bound is
 * a safety limit on untrusted input, not a product decision: a pasted list of
 * two hundred links must not become two hundred outbound crawls.
 *
 * Trailing punctuation is stripped because people write "see https://x.com/a."
 * and the full stop is a sentence, not part of the path.
 */
export function detectPromptUrls(message: string): string[] {
  const found: string[] = [];
  const seen = new Set<string>();
  for (const match of message.matchAll(PROMPT_URL_PATTERN)) {
    const raw = match[0];
    if (raw === undefined) {
      continue;
    }
    const cleaned = stripTrailingPunctuation(raw);
    const normalized = safeHttpUrl(cleaned);
    if (normalized === null || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    found.push(normalized);
    if (found.length >= PROMPT_URL_MAX_PER_MESSAGE) {
      break;
    }
  }
  return found;
}

/**
 * http/https only, and never a URL carrying credentials.
 *
 * These URLs come from an untrusted prompt and are about to be fetched by the
 * server, which is the shape of a server-side request forgery. Anything that
 * is not plainly a web page is refused here rather than deeper in the stack.
 */
function safeHttpUrl(value: string): string | null {
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

function stripTrailingPunctuation(value: string): string {
  return value.replace(/[.,;:!?)\]}'"]+$/u, '');
}
