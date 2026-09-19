import { documentMeta, parseMarkdownDocument } from '../utilities/markdown-document.utility';
import { buildWorkbook } from '../utilities/xlsx-workbook.utility';

/** Markdown to an Excel workbook: one sheet per table (F3b, ADR-108). */
export const convertToXlsx = async (
  markdown: string,
  title: string | null = null,
): Promise<Buffer> => {
  const blocks = parseMarkdownDocument(markdown);
  return buildWorkbook(blocks, documentMeta(blocks, title));
};
