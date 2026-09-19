import { Packer } from 'docx';

import { renderDocxDocument } from '../utilities/docx-document.utility';
import { documentMeta, parseMarkdownDocument } from '../utilities/markdown-document.utility';

/**
 * Markdown to a Word document (F3, ADR-107). Headings, emphasis, links, lists,
 * tables, code and quotes become real Word structures; it used to write every
 * line as a plain paragraph with the Markdown syntax still in it.
 */
export const convertToDocx = async (
  markdown: string,
  title: string | null = null,
): Promise<Buffer> => {
  const blocks = parseMarkdownDocument(markdown);
  return Buffer.from(
    await Packer.toBuffer(renderDocxDocument(blocks, documentMeta(blocks, title))),
  );
};
