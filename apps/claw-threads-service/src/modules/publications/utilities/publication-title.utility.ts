import {
  MAX_PUBLICATION_SLUG_LENGTH,
  MAX_PUBLICATION_TITLE_LENGTH,
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

/** A URL slug from the title (any script), ending in a short unique part; null when no letters. */
export function derivePublicationSlug(title: string, uniqueId: string): string | null {
  const words = title
    .toLowerCase()
    .normalize('NFKC')
    .replaceAll(/[^\p{L}\p{N}]+/gu, '-')
    .replaceAll(/^-+|-+$/gu, '')
    .slice(0, MAX_PUBLICATION_SLUG_LENGTH)
    .replaceAll(/-+$/gu, '');
  return words ? `${words}-${uniqueId.replaceAll('-', '').slice(0, 8)}` : null;
}
