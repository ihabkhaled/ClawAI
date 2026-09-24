import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';

import { convertToCsv } from '../adapters/csv.adapter';
import { convertToDocx } from '../adapters/docx.adapter';
import { convertToHtml } from '../adapters/html.adapter';
import { convertToJson } from '../adapters/json.adapter';
import { PdfRenderer } from '../adapters/pdf.adapter';
import { BlockKind, InlineKind, TableAlign } from '../enums/document-node.enum';
import type { DocumentBlock, TextNode } from '../types/markdown-document.types';
import { documentTitleFromFilename } from '../utilities/file-asset.utility';
import {
  documentMeta,
  isRightToLeft,
  parseMarkdownDocument,
  safeHref,
} from '../utilities/markdown-document.utility';
import { renderTypstDocument, typstString } from '../utilities/typst-document.utility';

const RICH = [
  '# Quarterly plan',
  '',
  'Some **bold**, _italic_, ~~gone~~ and `code`. A [link](https://example.com).',
  '',
  '- one',
  '  - nested',
  '- two',
  '',
  '3. third',
  '4. fourth',
  '',
  '| Name | Qty | Price |',
  '|:-----|:---:|------:|',
  '| Apple | 3 | 1.20 |',
  '| تفاح | 5 | 2 |',
  '',
  '```ts',
  'const x: number = 1;',
  '```',
  '',
  '> quoted',
  '',
  '---',
  '',
  'مرحبا بالعالم، هذه خطة الربع القادم',
  '',
  'हिन्दी में एक वाक्य। 中文句子。 ภาษาไทย',
].join('\n');

const texts = (blocks: DocumentBlock[]): TextNode[] =>
  blocks.flatMap((block) =>
    block.kind === BlockKind.PARAGRAPH || block.kind === BlockKind.HEADING
      ? block.content.filter((node): node is TextNode => node.kind === InlineKind.TEXT)
      : [],
  );

describe('parseMarkdownDocument', () => {
  const blocks = parseMarkdownDocument(RICH);

  it('reads every block kind once', () => {
    expect(blocks.map((block) => block.kind)).toEqual([
      BlockKind.HEADING,
      BlockKind.PARAGRAPH,
      BlockKind.LIST,
      BlockKind.LIST,
      BlockKind.TABLE,
      BlockKind.CODE,
      BlockKind.QUOTE,
      BlockKind.RULE,
      BlockKind.PARAGRAPH,
      BlockKind.PARAGRAPH,
    ]);
  });

  it('keeps emphasis as marks, not as asterisks', () => {
    const inline = texts([blocks[1] as DocumentBlock]);
    expect(inline.find((node) => node.text === 'bold')?.marks.bold).toBe(true);
    expect(inline.find((node) => node.text === 'italic')?.marks.italic).toBe(true);
    expect(inline.find((node) => node.text === 'gone')?.marks.strike).toBe(true);
    expect(inline.find((node) => node.text === 'code')?.marks.code).toBe(true);
    expect(inline.map((node) => node.text).join('')).not.toContain('*');
  });

  it('nests lists and keeps an ordered list start', () => {
    const [bullets, numbers] = blocks.filter((block) => block.kind === BlockKind.LIST);
    expect(bullets?.kind === BlockKind.LIST && bullets.items[0]?.[1]?.kind).toBe(BlockKind.LIST);
    expect(numbers?.kind === BlockKind.LIST && numbers.ordered && numbers.start).toBe(3);
  });

  it('reads table cells and alignment', () => {
    const table = blocks.find((block) => block.kind === BlockKind.TABLE);
    expect(table?.kind === BlockKind.TABLE && table.aligns).toEqual([
      TableAlign.LEFT,
      TableAlign.CENTER,
      TableAlign.RIGHT,
    ]);
    expect(table?.kind === BlockKind.TABLE && table.rows.length).toBe(2);
  });

  // Anything that could run in a viewer is reduced to text.
  it.each([
    ['javascript:alert(1)', null],
    ['file:///etc/passwd', null],
    ['data:text/html,<script>', null],
    ['https://example.com/a?b=1', 'https://example.com/a?b=1'],
    ['mailto:a@b.co', 'mailto:a@b.co'],
  ])('keeps link %s as %s', (href, expected) => {
    expect(safeHref(href)).toBe(expected);
  });

  it('keeps raw HTML as text and never as markup', () => {
    const [paragraph] = parseMarkdownDocument('<script>alert(1)</script> hi');
    expect(
      paragraph?.kind === BlockKind.PARAGRAPH &&
        texts([paragraph])
          .map((n) => n.text)
          .join(''),
    ).toContain('<script>alert(1)</script>');
  });

  it('refuses a code language that is not a language name', () => {
    const [code] = parseMarkdownDocument('```ts; rm -rf /\nx\n```');
    expect(code?.kind === BlockKind.CODE && code.language).toBeNull();
  });
});

describe('direction and title', () => {
  it.each([
    ['مرحبا world', true],
    ['שלום', true],
    ['سلام دنیا', true],
    ['Hello مرحبا', false],
    ['123 !! مرحبا', true],
    ['中文', false],
    ['', false],
  ])('%j is right to left: %s', (text, rtl) => {
    expect(isRightToLeft(text)).toBe(rtl);
  });

  it('titles a document by its first heading, else the fallback', () => {
    expect(documentMeta(parseMarkdownDocument('text\n\n## Real title'), 'x').title).toBe(
      'Real title',
    );
    expect(documentMeta(parseMarkdownDocument('no heading'), 'Fallback').title).toBe('Fallback');
    expect(documentMeta(parseMarkdownDocument('no heading'), null).title).toBe('Document');
  });

  it.each([
    ['generated-1726000000000.pdf', null],
    ['Quarterly plan.pdf', 'Quarterly plan'],
    ['Plan', 'Plan'],
    [null, null],
  ])('reads a title from filename %j', (filename, expected) => {
    expect(documentTitleFromFilename(filename)).toBe(expected);
  });
});

describe('Typst source', () => {
  it.each([
    ['plain', '"plain"'],
    ['quote " and \\ backslash', '"quote \\" and \\\\ backslash"'],
    ['line\nbreak\ttab', '"line\\nbreak\\ttab"'],
    [`bell${String.fromCharCode(7)}null${String.fromCharCode(0)}`, '"bellnull"'],
  ])('writes %j as a string literal', (value, expected) => {
    expect(typstString(value)).toBe(expected);
  });

  // The whole injection defence: answer text is only ever a string literal.
  it('prints Typst code in an answer instead of running it', () => {
    const hostile = '#read("/etc/passwd") ]#set text(fill: red)[ #import "x.typ" $x$ <label> @ref';
    const blocks = parseMarkdownDocument(hostile);
    const source = renderTypstDocument(blocks, documentMeta(blocks, null));

    expect(source).toContain(typstString(hostile));
    expect(new PdfRenderer().render(hostile, null).subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('gives a right-to-left paragraph its own direction', () => {
    const blocks = parseMarkdownDocument('Intro\n\nمرحبا بالعالم');
    expect(renderTypstDocument(blocks, documentMeta(blocks, null))).toContain(
      '#set text(dir: rtl)',
    );
  });
});

describe('rendered files', () => {
  it('renders every block kind and script to a PDF', () => {
    const pdf = new PdfRenderer().render(RICH, 'Quarterly plan');
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(pdf.length).toBeGreaterThan(5_000);
  });

  it('renders a long answer without truncating it', () => {
    const long = Array.from(
      { length: 2_000 },
      (_, index) => `Paragraph ${String(index)} with some words.`,
    ).join('\n\n');
    expect(new PdfRenderer().render(long, null).length).toBeGreaterThan(20_000);
  });

  it('writes Word structures, not Markdown syntax', async () => {
    const zip = await JSZip.loadAsync(await convertToDocx(RICH, 'Quarterly plan'));
    const xml = (await zip.file('word/document.xml')?.async('string')) ?? '';
    const core = (await zip.file('docProps/core.xml')?.async('string')) ?? '';

    expect(xml).toContain('<w:b/>');
    expect(xml).toContain('<w:i/>');
    expect(xml).toContain('<w:tbl>');
    expect(xml).toContain('w:numPr');
    expect(xml).toContain('<w:bidi/>');
    expect(xml).toContain('Consolas');
    expect(xml).toContain('تفاح');
    expect(xml).not.toContain('**');
    expect(xml).not.toContain('```');
    expect(core).toContain('Quarterly plan');
  });

  it('names and directs an HTML page by its content, and escapes the title', () => {
    const html = convertToHtml('# Plan <b>&</b>\n\ntext', null).toString();
    expect(html).toContain('<title>Plan &lt;b&gt;&amp;&lt;/b&gt;</title>');
    expect(html).toContain('dir="ltr"');
    expect(convertToHtml('مرحبا بالعالم', null).toString()).toContain('dir="rtl"');
  });

  it('never lets an answer put a script in the HTML page', () => {
    const html = convertToHtml(
      '<script>alert(1)</script>\n\n[x](javascript:alert(1))',
      null,
    ).toString();
    expect(html).not.toContain('<script>alert');
    expect(html).not.toContain('href="javascript:');
  });

  it('exports a Markdown table as CSV, quoting as CSV requires', () => {
    const csv = convertToCsv('| Name | Note |\n|---|---|\n| A, B | say "hi" |').toString();
    expect(csv).toBe('Name,Note\n"A, B","say ""hi"""\n');
  });

  // Live 2026-09-25: gemini-3.5-flash-lite wrote an Arabic table with no
  // `|---|` row, markdown-it saw a paragraph, and the CSV was one column.
  it('reads a pipe table that is missing its separator row', () => {
    const csv = convertToCsv('|المنتج|السعر|\n|منتج 1|100|\n|منتج 2|200|').toString();
    expect(csv).toBe('المنتج,السعر\nمنتج 1,100\nمنتج 2,200\n');
  });

  it('does not invent a table from a single pipe line', () => {
    const blocks = parseMarkdownDocument('| just one line |');
    expect(blocks.some((block) => block.kind === BlockKind.TABLE)).toBe(false);
  });

  it('exports a Markdown table as JSON records', () => {
    const json = JSON.parse(
      convertToJson('Intro\n\n| k | v |\n|---|---|\n| a | 1 |').toString(),
    ) as unknown;
    expect(json).toEqual([{ k: 'a', v: '1' }]);
  });
});
