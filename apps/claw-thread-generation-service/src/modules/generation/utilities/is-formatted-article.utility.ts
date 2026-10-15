import {
  FORMATTED_MAX_PARAGRAPH_WORDS,
  FORMATTED_MIN_SECTIONS,
  FORMATTED_SHORT_ARTICLE_WORDS,
} from '../constants/format-scan.constants';
import {
  countListItems,
  countTables,
  headingsOf,
  paragraphsOf,
} from './format-markdown-scan.utility';

/**
 * True when the article already has the shape the format stage would give it: a title, at least
 * two H2 sections (on a longer article), a list or a table, and no wall of text. Asking a model to
 * reformat it again would only spend money, so the stage is skipped; this is what makes it idempotent.
 */
export function isFormattedArticle(markdown: string): boolean {
  const headings = headingsOf(markdown);
  const titles = headings.filter(({ level }) => level === 1).length;
  const sections = headings.filter(({ level }) => level === 2).length;
  const structured = countListItems(markdown) > 0 || countTables(markdown) > 0;
  const wall = paragraphsOf(markdown).some(
    (paragraph) => paragraph.split(/\s+/u).length > FORMATTED_MAX_PARAGRAPH_WORDS,
  );
  const needsSections = markdown.split(/\s+/u).length > FORMATTED_SHORT_ARTICLE_WORDS;
  return (
    titles === 1 && (!needsSections || sections >= FORMATTED_MIN_SECTIONS) && structured && !wall
  );
}
