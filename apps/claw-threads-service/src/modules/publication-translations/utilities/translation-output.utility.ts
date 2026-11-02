import {
  MARKDOWN_CODE_FENCE,
  TRANSLATION_BODY_MARKER,
  TRANSLATION_DEFINITION_DESTINATION_PATTERN,
  TRANSLATION_HTML_TAG_PATTERN,
  TRANSLATION_INLINE_DESTINATION_PATTERN,
  TRANSLATION_MAX_LENGTH_RATIO,
  TRANSLATION_MIN_LENGTH_RATIO,
  TRANSLATION_REASONING_TAGS,
  TRANSLATION_SCHEME_PATTERN,
  TRANSLATION_SCRIPT_URL,
  TRANSLATION_TITLE_MARKER,
  TRANSLATION_URL_PATTERN,
  TRANSLATION_WRAPPER_OPENERS,
  TRANSLATION_WWW_PATTERN,
} from '../constants/publication-translation.constants';

/**
 * The answer after a reasoning block. The notes inside it repeat the markers and half the text, so
 * they must go before anything is parsed. A block that never closes means the reply was cut off.
 */
export function stripReasoning(reply: string): string {
  let text = reply;
  for (const { open, close } of TRANSLATION_REASONING_TAGS) {
    const closedAt = text.lastIndexOf(close);
    if (closedAt >= 0) text = text.slice(closedAt + close.length);
    else if (text.includes(open)) return '';
  }
  return text;
}

/** Models sometimes wrap the whole answer in a fence; the wrapper is not part of the translation. */
export function stripOuterFence(text: string): string {
  const lines = stripReasoning(text).trim().split('\n');
  const first = lines[0]?.trim() ?? '';
  const last = lines.at(-1)?.trim() ?? '';
  const isWrapper =
    TRANSLATION_WRAPPER_OPENERS.includes(first) && last === MARKDOWN_CODE_FENCE && lines.length > 2;
  return isWrapper ? lines.slice(1, -1).join('\n').trim() : lines.join('\n');
}

function countFences(text: string): number {
  return text.split(MARKDOWN_CODE_FENCE).length - 1;
}

/** The first chunk carries the title: `TITLE:` line(s), then `BODY:` and the text. */
export function parseTitledChunk(reply: string): { title: string; body: string } | null {
  const text = stripOuterFence(reply);
  const bodyAt = text.indexOf(TRANSLATION_BODY_MARKER);
  if (!text.startsWith(TRANSLATION_TITLE_MARKER) || bodyAt < 0) return null;
  const title = text.slice(TRANSLATION_TITLE_MARKER.length, bodyAt).trim();
  const body = text.slice(bodyAt + TRANSLATION_BODY_MARKER.length).trim();
  return title === '' || body === '' ? null : { title, body };
}

/** Drops a leading `BODY:` the model repeated on a plain continuation chunk. */
export function parseBodyChunk(reply: string): string | null {
  const text = stripOuterFence(reply);
  const body = text.startsWith(TRANSLATION_BODY_MARKER)
    ? text.slice(TRANSLATION_BODY_MARKER.length).trim()
    : text;
  return body === '' ? null : body;
}

/**
 * Cheap sanity checks on a whole translation: not empty, a plausible length next to the source,
 * and the code fences still pair up. They catch refusals, truncation and chatter, not nuance.
 */
export function isPlausibleTranslation(source: string, translated: string): boolean {
  const ratio = translated.length / Math.max(source.length, 1);
  return (
    translated.trim() !== '' &&
    ratio >= TRANSLATION_MIN_LENGTH_RATIO &&
    ratio <= TRANSLATION_MAX_LENGTH_RATIO &&
    countFences(source) % 2 === countFences(translated) % 2
  );
}

/** A link that leaves the page: it names a scheme, starts with `//`, or is a `www.` autolink. */
function isExternalLink(link: string): boolean {
  const lower = link.toLowerCase();
  return (
    TRANSLATION_SCHEME_PATTERN.test(lower) || lower.startsWith('//') || lower.startsWith('www.')
  );
}

function normaliseLink(link: string): string {
  return link.toLowerCase().replace(/[.,;:!?]+$/u, '');
}

/**
 * Every address a Markdown renderer would turn into a link: absolute and protocol-relative URLs,
 * `www.` autolinks, and the destination of an inline link or a reference definition when it names
 * a scheme. Compared case-insensitively, so `HTTPS://x` and `https://x` are the same address.
 */
function linksOf(text: string): Set<string> {
  const found = [
    ...(text.match(TRANSLATION_URL_PATTERN) ?? []),
    ...(text.match(TRANSLATION_WWW_PATTERN) ?? []),
    ...[...text.matchAll(TRANSLATION_INLINE_DESTINATION_PATTERN)].map((match) => match[1] ?? ''),
    ...[...text.matchAll(TRANSLATION_DEFINITION_DESTINATION_PATTERN)].map(
      (match) => match[1] ?? '',
    ),
  ].filter((link) => isExternalLink(link));
  return new Set(found.map(normaliseLink));
}

/**
 * A translation is the source in another language: it must not bring a link, a tag or a script
 * address the source did not have. A model that was talked into adding one by the article text is
 * caught here, before the copy is stored (the source itself went through the safety review).
 */
export function addsNoLinksOrMarkup(source: string, translated: string): boolean {
  const known = linksOf(source);
  const noNewLinks = [...linksOf(translated)].every((url) => known.has(url));
  const tagCount = (text: string): number => text.match(TRANSLATION_HTML_TAG_PATTERN)?.length ?? 0;
  const noNewScript =
    !translated.toLowerCase().includes(TRANSLATION_SCRIPT_URL) ||
    source.toLowerCase().includes(TRANSLATION_SCRIPT_URL);
  return noNewLinks && tagCount(translated) <= tagCount(source) && noNewScript;
}
