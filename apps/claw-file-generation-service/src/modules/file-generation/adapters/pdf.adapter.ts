import { existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { NodeCompiler } from '@myriaddreamin/typst-ts-node-compiler';

import { TYPST_FONT_DIRECTORIES } from '../constants/document-render.constants';
import { documentMeta, parseMarkdownDocument } from '../utilities/markdown-document.utility';
import { renderTypstDocument } from '../utilities/typst-document.utility';

/**
 * Markdown to PDF through Typst (F3, ADR-107).
 *
 * pdfkit drew each line in Helvetica, which has no Arabic, Hindi, Thai or CJK
 * glyphs, and printed tables, code fences and `**bold**` as raw Markdown.
 * Typst shapes every script with the fonts in the image, runs right to left
 * where the text does, and lays out tables and code. It is a sandbox with no
 * network or shell. Its workspace is an empty directory, so the one thing it
 * can read, files under the workspace, is nothing.
 */
export class PdfRenderer {
  private compiler: NodeCompiler | null = null;

  render(markdown: string, title: string | null): Buffer {
    const blocks = parseMarkdownDocument(markdown);
    const source = renderTypstDocument(blocks, documentMeta(blocks, title));
    try {
      return this.getCompiler().pdf({ mainFileContent: source });
    } catch {
      // Never echo the source: it is the user's answer.
      throw new Error('PDF rendering failed');
    }
  }

  private getCompiler(): NodeCompiler {
    this.compiler ??= NodeCompiler.create({
      workspace: mkdtempSync(join(tmpdir(), 'claw-typst-')),
      fontArgs: [
        { fontPaths: TYPST_FONT_DIRECTORIES.filter((directory) => existsSync(directory)) },
      ],
    });
    return this.compiler;
  }
}
