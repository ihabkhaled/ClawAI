import {
  HEADING_BLANK,
  HEADING_CLOSING,
  MAX_HEADING_LEVEL,
  MAX_PUBLICATION_SLUG_LENGTH,
  MAX_PUBLICATION_TITLE_LENGTH,
  MULTILINE_LINE_BREAK,
  RESERVED_PUBLICATION_SLUGS,
  UNTITLED_PUBLICATION_TITLE,
} from '../constants/publication-title.constants';

/**
 * `[text](target)` and `![text](target)` become their text. CodeQL js/polynomial-redos: the
 * earlier regex re-scanned to the first `]` from every `[`, so a run of `[` cost the square of its
 * length. Same matches, leftmost first, with each `]` and `)` looked up once.
 */
function dropLinkTargets(text: string): string {
  let output = '';
  let copied = 0;
  let close = -1;
  let paren = -1;
  let open = text.indexOf('[');
  while (open >= 0) {
    if (close < open) close = text.indexOf(']', open + 1);
    if (close < 0) break;
    if (text.charAt(close + 1) !== '(') {
      open = text.indexOf('[', open + 1);
      continue;
    }
    if (paren < close + 2) paren = text.indexOf(')', close + 2);
    if (paren < 0) break;
    const start = open - 1 >= copied && text.charAt(open - 1) === '!' ? open - 1 : open;
    output += text.slice(copied, start) + text.slice(open + 1, close);
    copied = paren + 1;
    open = text.indexOf('[', copied);
  }
  return output + text.slice(copied);
}

/** Strips inline markdown marks so a title reads as plain text. */
function plain(text: string): string {
  return dropLinkTargets(text)
    .replaceAll(/[*_`~>#]/gu, '')
    .replaceAll(/\s+/gu, ' ')
    .trim();
}

/**
 * The text of one ATX heading line (`## Title ##`), or undefined: the same capture as the earlier
 * `^#{1,6}[ \t]+(.+?)[ \t#]*$` with the `m` flag, which CodeQL js/polynomial-redos flagged (the
 * lazy text and the closing run overlap, so a long run of blanks cost the square of its length).
 */
function headingTextOf(line: string): string | undefined {
  let hashes = 0;
  while (line.charAt(hashes) === '#') hashes += 1;
  if (hashes < 1 || hashes > MAX_HEADING_LEVEL) return undefined;
  let textStart = hashes;
  while (HEADING_BLANK.test(line.charAt(textStart))) textStart += 1;
  if (textStart === hashes) return undefined;
  let closingStart = line.length;
  while (closingStart > 0 && HEADING_CLOSING.test(line.charAt(closingStart - 1))) closingStart -= 1;
  if (textStart < line.length) return line.slice(textStart, Math.max(closingStart, textStart + 1));
  // Only blanks follow the marks: the regex gave its last blank back as a one-character text.
  return textStart - hashes > 1 ? line.at(-1) : undefined;
}

function firstHeadingText(markdown: string): string | undefined {
  for (const line of markdown.split(MULTILINE_LINE_BREAK)) {
    const text = headingTextOf(line);
    if (text !== undefined) return text;
  }
  return undefined;
}

/**
 * The title is the first heading of any level; with no heading it is the first sentence of the
 * text, and only a text with nothing readable in it is called "Untitled draft".
 */
export function derivePublicationTitle(markdown: string): string {
  const heading = firstHeadingText(markdown);
  const fromHeading = heading ? plain(heading) : '';
  if (fromHeading) return fromHeading.slice(0, MAX_PUBLICATION_TITLE_LENGTH);
  const body = plain(markdown.replaceAll(/```[\s\S]*?```/gu, ' '));
  const sentence = /^.+?(?:[.!?؟。](?=\s|$)|$)/u.exec(body)?.[0]?.trim() ?? '';
  return sentence ? sentence.slice(0, MAX_PUBLICATION_TITLE_LENGTH) : UNTITLED_PUBLICATION_TITLE;
}

const graphemes = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

/** At most `limit` code points, cut only between user-perceived characters (never inside a cluster). */
function clipByGraphemes(text: string, limit: number): string {
  let kept = '';
  let count = 0;
  for (const { segment } of graphemes.segment(text)) {
    const size = [...segment].length;
    if (count + size > limit) break;
    kept += segment;
    count += size;
  }
  return kept;
}

/**
 * A URL slug from the title (any script), ending in a short unique part; null when no letters, and
 * null for a word the public routes use as a path segment (`board`, `discover`, `sitemap`).
 * Letters, combining marks (vowel signs, tone marks, harakat, viraama) and digits are kept, so
 * Hindi, Thai, Arabic, Hebrew, Tamil and Bengali words stay whole; everything else becomes `-`.
 * The text is NFKC-normalised (a composed form), and the cap is applied per grapheme.
 */
export function derivePublicationSlug(title: string, uniqueId: string): string | null {
  const words = clipByGraphemes(
    title
      .normalize('NFKC')
      .toLowerCase()
      .normalize('NFC')
      .replaceAll(/[^\p{L}\p{M}\p{N}]+/gu, '-')
      .replaceAll(/^-+|-+$/gu, ''),
    MAX_PUBLICATION_SLUG_LENGTH,
  ).replaceAll(/-+$/gu, '');
  if (!/[\p{L}\p{N}]/u.test(words)) return null;
  const slug = `${words}-${uniqueId.replaceAll('-', '').slice(0, 8)}`;
  return RESERVED_PUBLICATION_SLUGS.has(slug) ? null : slug;
}
