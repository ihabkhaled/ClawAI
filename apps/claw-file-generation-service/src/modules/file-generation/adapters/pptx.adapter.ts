import { documentMeta, parseMarkdownDocument } from '../utilities/markdown-document.utility';
import { buildDeck } from '../utilities/pptx-deck.utility';

/** Markdown to a slide deck: a slide per heading (F3b, ADR-108). */
export const convertToPptx = async (
  markdown: string,
  title: string | null = null,
): Promise<Buffer> => {
  const blocks = parseMarkdownDocument(markdown);
  return buildDeck(blocks, documentMeta(blocks, title));
};
