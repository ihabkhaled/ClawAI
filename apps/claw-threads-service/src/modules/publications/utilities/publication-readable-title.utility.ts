import { UNTITLED_PUBLICATION_TITLE } from '../constants/publication-title.constants';
import { derivePublicationTitle } from './publication-title.utility';

function markdownOf(content: unknown): string | null {
  if (typeof content !== 'object' || content === null || !('markdown' in content)) return null;
  return typeof content.markdown === 'string' ? content.markdown : null;
}

/**
 * The title a person should read for a revision. A Thread stored before titles were derived from
 * the text carries the placeholder "Untitled draft"; for those the title is derived from the
 * article now. Empty when the article has nothing readable either, so no caller shows the
 * placeholder as if it were the Thread's name.
 */
export function readablePublicationTitle(storedTitle: string, content: unknown): string {
  const stored = storedTitle.trim();
  if (stored !== '' && stored !== UNTITLED_PUBLICATION_TITLE) return stored;
  const markdown = markdownOf(content);
  if (markdown === null) return '';
  const derived = derivePublicationTitle(markdown);
  return derived === UNTITLED_PUBLICATION_TITLE ? '' : derived;
}
