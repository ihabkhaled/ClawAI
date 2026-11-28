import {
  UNTRUSTED_HOSTILE_CODE_POINT_RANGES,
  UNTRUSTED_TRUST_VALUE,
  WEB_SOURCE_CLOSING_TAG,
  WEB_SOURCE_CLOSING_TAG_BARE,
  WEB_SOURCE_CLOSING_TAG_DEFANGED,
  WEB_SOURCE_FENCE_MIN_BODY_CHARS,
  WEB_SOURCE_NO_TITLE,
  WEB_SOURCE_OPENING_TAG,
  WEB_SOURCE_OPENING_TAG_BARE,
  WEB_SOURCE_OPENING_TAG_DEFANGED,
  WEB_SOURCE_TAG,
  WEB_SOURCE_TITLE_LABEL,
  WEB_SOURCE_TITLE_LINE_BREAKS,
  WEB_SOURCE_TITLE_MAX_CHARS,
  WEB_SOURCE_TRUNCATION_MARKER,
  WEB_SOURCE_URL_MAX_CHARS,
  WEB_SOURCE_URL_UNSAFE,
  WEB_SOURCES_LEFT_OUT_NOTE,
} from '../constants/untrusted-fence.constants';
import type { UntrustedFenceInput, WebSourceFenceInput } from '../types/untrusted-fence.types';

function isHostileCodePoint(codePoint: number): boolean {
  return UNTRUSTED_HOSTILE_CODE_POINT_RANGES.some(
    ([from, to]) => codePoint >= from && codePoint <= to,
  );
}

/** Removes controls, zero-width, joiner, bidi and BOM code points; tab, newline and carriage return stay. */
export function stripHostileCodePoints(text: string): string {
  let kept = '';
  for (const character of text) {
    const codePoint = character.codePointAt(0);
    if (codePoint !== undefined && !isHostileCodePoint(codePoint)) kept += character;
  }
  return kept;
}

/** Plain text only: NFC, no hostile code points, capped with a visible marker when `maxChars` is given. */
export function sanitizeUntrustedText(
  text: string,
  maxChars?: number,
  truncationMarker: string = WEB_SOURCE_TRUNCATION_MARKER,
): string {
  const cleaned = stripHostileCodePoints(text.normalize('NFC'));
  return maxChars === undefined || cleaned.length <= maxChars
    ? cleaned
    : cleaned.slice(0, Math.max(0, maxChars)) + truncationMarker;
}

/** Replaces every match of each pattern (global regexes) with its harmless spelling. */
export function defangFenceTags(
  text: string,
  replacements: ReadonlyArray<readonly [RegExp, string]>,
): string {
  return replacements.reduce(
    (current, [pattern, harmless]) => current.replaceAll(pattern, harmless),
    text,
  );
}

/** An attribute value with every character the pattern calls unsafe removed (after hostile code points). */
export function sanitizeFenceAttribute(value: string, unsafe: RegExp): string {
  return stripHostileCodePoints(value.normalize('NFC')).replaceAll(unsafe, '');
}

/** `<tag a="…" trust="untrusted">\nbody\n</tag>`; the caller has already made the body unable to close it. */
export function fenceUntrusted(input: UntrustedFenceInput): string {
  const attributes = input.attributes.map(([name, value]) => ` ${name}="${value}"`).join('');
  return `<${input.tag}${attributes} trust="${UNTRUSTED_TRUST_VALUE}">\n${input.body}\n</${input.tag}>`;
}

/** Defangs every opening and closing `web_source` spelling, so page text can neither close nor forge a fence. */
export function defangWebSourceTags(text: string): string {
  return defangFenceTags(text, [
    [WEB_SOURCE_CLOSING_TAG, WEB_SOURCE_CLOSING_TAG_DEFANGED],
    [WEB_SOURCE_CLOSING_TAG_BARE, WEB_SOURCE_CLOSING_TAG_DEFANGED],
    [WEB_SOURCE_OPENING_TAG, WEB_SOURCE_OPENING_TAG_DEFANGED],
    [WEB_SOURCE_OPENING_TAG_BARE, WEB_SOURCE_OPENING_TAG_DEFANGED],
  ]);
}

/** A URL safe inside `url="…"`: no hostile code points, quotes, angle brackets or spaces (percent-encoded), capped. */
export function sanitizeWebSourceUrl(url: string): string {
  return stripHostileCodePoints(url.normalize('NFC').trim())
    .replaceAll(WEB_SOURCE_URL_UNSAFE, (character) =>
      character === "'" ? '%27' : encodeURIComponent(character),
    )
    .slice(0, WEB_SOURCE_URL_MAX_CHARS);
}

function oneLine(text: string): string {
  return defangWebSourceTags(
    sanitizeUntrustedText(text).replaceAll(WEB_SOURCE_TITLE_LINE_BREAKS, ' ').trim(),
  );
}

function webSourceTitle(title: string | null | undefined): string {
  const cleaned = oneLine(title ?? '').slice(0, WEB_SOURCE_TITLE_MAX_CHARS);
  return cleaned.length > 0 ? cleaned : WEB_SOURCE_NO_TITLE;
}

/**
 * One web source as a model sees it (research engine B1):
 *
 *   <web_source n="1" url="https://…" trust="untrusted">
 *   Title: …
 *   …page text…
 *   </web_source>
 *
 * `n` is the number the model cites as `[n]` and the number stored citations use, unchanged. Everything inside is
 * sanitised and every `web_source` tag spelling in it is defanged, so a page cannot end its fence early or forge one.
 */
export function fenceWebSource(input: WebSourceFenceInput): string {
  const text = defangWebSourceTags(sanitizeUntrustedText(input.text, input.maxTextChars)).trim();
  const details = (input.details ?? []).map(oneLine).filter((line) => line.length > 0);
  const body = [
    `${WEB_SOURCE_TITLE_LABEL}${webSourceTitle(input.title)}`,
    ...details,
    ...(text.length > 0 ? [text] : []),
  ].join('\n');
  return fenceUntrusted({
    tag: WEB_SOURCE_TAG,
    attributes: [
      ['n', String(Math.max(0, Math.trunc(input.n)))],
      ['url', sanitizeWebSourceUrl(input.url)],
    ],
    body,
  });
}

/**
 * Several web sources within `maxChars`, every fence closed: each text is cut to the room left, and a source with
 * too little room is left out (and counted in a closing note) rather than cut open by a later truncation.
 */
export function fenceWebSources(
  sources: readonly WebSourceFenceInput[],
  maxChars: number,
  minBodyChars: number = WEB_SOURCE_FENCE_MIN_BODY_CHARS,
): string {
  const noteReserve = WEB_SOURCES_LEFT_OUT_NOTE.length + 8;
  const parts: string[] = [];
  let used = 0;
  let leftOut = 0;
  for (const [index, source] of sources.entries()) {
    const overhead =
      fenceWebSource({ ...source, text: '' }).length + 1 + WEB_SOURCE_TRUNCATION_MARKER.length;
    const room = maxChars - used - noteReserve - overhead;
    if (room < minBodyChars) {
      leftOut = sources.length - index;
      break;
    }
    const fenced = fenceWebSource({
      ...source,
      maxTextChars: Math.min(source.maxTextChars ?? Number.POSITIVE_INFINITY, room),
    });
    parts.push(fenced);
    used += fenced.length + 1;
  }
  if (leftOut > 0) {
    parts.push(WEB_SOURCES_LEFT_OUT_NOTE.replace('{count}', String(leftOut)));
  }
  return parts.join('\n');
}
