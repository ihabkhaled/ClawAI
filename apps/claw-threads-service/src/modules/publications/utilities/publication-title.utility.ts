import {
  MAX_PUBLICATION_SLUG_LENGTH,
  MAX_PUBLICATION_TITLE_LENGTH,
  RESERVED_PUBLICATION_SLUGS,
  UNTITLED_PUBLICATION_TITLE,
} from '../constants/publication-title.constants';

/** Strips inline markdown marks so a title reads as plain text. */
function plain(text: string): string {
  return text
    .replaceAll(/!?\[([^\]]*)\]\([^)]*\)/gu, '$1')
    .replaceAll(/[*_`~>#]/gu, '')
    .replaceAll(/\s+/gu, ' ')
    .trim();
}

/**
 * The title is the first heading of any level; with no heading it is the first sentence of the
 * text, and only a text with nothing readable in it is called "Untitled draft".
 */
export function derivePublicationTitle(markdown: string): string {
  const heading = /^#{1,6}[ \t]+(.+?)[ \t#]*$/mu.exec(markdown)?.[1];
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
