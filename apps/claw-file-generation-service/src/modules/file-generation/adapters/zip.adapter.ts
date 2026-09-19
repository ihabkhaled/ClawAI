import { parseMarkdownDocument } from '../utilities/markdown-document.utility';
import { buildBundle } from '../utilities/zip-bundle.utility';

/** Markdown to a zip: README, code files and table CSVs (F3b, ADR-108). */
export const convertToZip = async (markdown: string): Promise<Buffer> =>
  buildBundle(markdown, parseMarkdownDocument(markdown));
