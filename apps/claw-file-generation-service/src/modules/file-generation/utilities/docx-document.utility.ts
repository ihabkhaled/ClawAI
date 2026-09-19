import {
  AlignmentType,
  BorderStyle,
  Document,
  ExternalHyperlink,
  type FileChild,
  HeadingLevel,
  LevelFormat,
  Paragraph,
  type ParagraphChild,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';

import {
  DOCX_BODY_FONT,
  DOCX_BODY_SIZE,
  DOCX_CODE_SHADING,
  DOCX_MONO_FONT,
  DOCX_NUMBERING_REFERENCE,
  DOCX_TABLE_HEADER_SHADING,
} from '../constants/document-render.constants';
import { BlockKind, InlineKind, TableAlign } from '../enums/document-node.enum';
import type { DocxBlockContext, NumberingCounter } from '../types/docx.types';
import type {
  CodeBlock,
  DocumentBlock,
  DocumentMeta,
  InlineNode,
  TableBlock,
} from '../types/markdown-document.types';
import { blockText, isRightToLeft } from './markdown-document.utility';

/**
 * The blocks as a Word document (F3, ADR-107).
 *
 * It used to write each line as a plain paragraph, so `**bold**`, tables and
 * code fences reached Word as raw Markdown. Now headings, emphasis, links,
 * lists, tables, code and quotes are real Word structures, and right-to-left
 * paragraphs are marked bidirectional so Word lays them out right to left.
 */
export function renderDocxDocument(blocks: DocumentBlock[], meta: DocumentMeta): Document {
  return new Document({
    title: meta.title,
    creator: 'ClawAI',
    styles: { default: { document: { run: { font: DOCX_BODY_FONT, size: DOCX_BODY_SIZE } } } },
    numbering: {
      config: [
        {
          reference: DOCX_NUMBERING_REFERENCE,
          levels: Array.from({ length: 9 }, (_, level) => ({
            level,
            format: LevelFormat.DECIMAL,
            text: `%${String(level + 1)}.`,
            alignment: AlignmentType.START,
            style: { paragraph: { indent: { left: 720 * (level + 1), hanging: 360 } } },
          })),
        },
      ],
    },
    sections: [
      {
        children: renderBlocks(
          blocks,
          { listLevel: -1, ordered: false, instance: 0, quote: false },
          { next: 1 },
        ),
      },
    ],
  });
}

function renderBlocks(
  blocks: DocumentBlock[],
  context: DocxBlockContext,
  instances: NumberingCounter,
): FileChild[] {
  return blocks.flatMap((block) => renderBlock(block, context, instances));
}

function renderBlock(
  block: DocumentBlock,
  context: DocxBlockContext,
  instances: NumberingCounter,
): FileChild[] {
  const rtl = isRightToLeft(blockText(block));
  switch (block.kind) {
    case BlockKind.HEADING:
      return [
        new Paragraph({
          heading: headingLevel(block.level),
          bidirectional: rtl,
          children: renderInline(block.content, rtl),
        }),
      ];
    case BlockKind.PARAGRAPH:
      return [paragraph(renderInline(block.content, rtl), context, rtl)];
    case BlockKind.LIST: {
      const instance = instances.next;
      instances.next += 1;
      const itemContext: DocxBlockContext = {
        listLevel: context.listLevel + 1,
        ordered: block.ordered,
        instance,
        quote: context.quote,
      };
      return block.items.flatMap((item) => renderBlocks(item, itemContext, instances));
    }
    case BlockKind.CODE:
      return [codeParagraph(block)];
    case BlockKind.QUOTE:
      return renderBlocks(block.blocks, { ...context, quote: true }, instances);
    case BlockKind.TABLE:
      return [renderTable(block)];
    case BlockKind.RULE:
      return [
        new Paragraph({
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'BFBFBF', space: 1 } },
          children: [],
        }),
      ];
  }
}

/** A body paragraph, as a list item or a quote line when the context says so. */
function paragraph(children: ParagraphChild[], context: DocxBlockContext, rtl: boolean): Paragraph {
  const level = Math.min(Math.max(context.listLevel, 0), 8);
  return new Paragraph({
    children,
    bidirectional: rtl,
    ...(context.listLevel >= 0 && !context.ordered ? { bullet: { level } } : {}),
    ...(context.listLevel >= 0 && context.ordered
      ? { numbering: { reference: DOCX_NUMBERING_REFERENCE, level, instance: context.instance } }
      : {}),
    ...(context.quote
      ? {
          indent: { left: 720 },
          border: { left: { style: BorderStyle.SINGLE, size: 12, color: 'BFBFBF', space: 8 } },
        }
      : {}),
  });
}

function codeParagraph(block: CodeBlock): Paragraph {
  return new Paragraph({
    shading: { type: ShadingType.CLEAR, fill: DOCX_CODE_SHADING, color: 'auto' },
    children: block.text
      .split('\n')
      .map(
        (line, index) =>
          new TextRun({ text: line, font: DOCX_MONO_FONT, break: index > 0 ? 1 : 0 }),
      ),
  });
}

function renderTable(table: TableBlock): Table {
  const columns = Math.max(table.header.length, ...table.rows.map((row) => row.length), 1);
  const row = (cells: InlineNode[][], header: boolean): TableRow =>
    new TableRow({
      tableHeader: header,
      children: Array.from({ length: columns }, (_, index) => {
        const content = cells[index] ?? [];
        const rtl = isRightToLeft(
          content.map((node) => (node.kind === InlineKind.TEXT ? node.text : '')).join(''),
        );
        return new TableCell({
          ...(header
            ? {
                shading: {
                  type: ShadingType.CLEAR,
                  fill: DOCX_TABLE_HEADER_SHADING,
                  color: 'auto',
                },
              }
            : {}),
          children: [
            new Paragraph({
              bidirectional: rtl,
              alignment: docxAlign(table.aligns[index]),
              children: renderInline(content, rtl, header),
            }),
          ],
        });
      }),
    });
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      ...(table.header.length > 0 ? [row(table.header, true)] : []),
      ...table.rows.map((cells) => row(cells, false)),
    ],
  });
}

function headingLevel(level: number): (typeof HeadingLevel)[keyof typeof HeadingLevel] {
  switch (level) {
    case 1:
      return HeadingLevel.HEADING_1;
    case 2:
      return HeadingLevel.HEADING_2;
    case 3:
      return HeadingLevel.HEADING_3;
    case 4:
      return HeadingLevel.HEADING_4;
    case 5:
      return HeadingLevel.HEADING_5;
    default:
      return HeadingLevel.HEADING_6;
  }
}

function docxAlign(
  align: TableAlign | undefined,
): (typeof AlignmentType)[keyof typeof AlignmentType] {
  switch (align) {
    case TableAlign.CENTER:
      return AlignmentType.CENTER;
    case TableAlign.RIGHT:
      return AlignmentType.END;
    default:
      return AlignmentType.START;
  }
}

function renderInline(nodes: InlineNode[], rtl: boolean, bold = false): ParagraphChild[] {
  return nodes.flatMap((node): ParagraphChild[] => {
    switch (node.kind) {
      case InlineKind.TEXT:
        return [
          new TextRun({
            text: node.text,
            bold: bold || node.marks.bold,
            italics: node.marks.italic,
            strike: node.marks.strike,
            rightToLeft: rtl,
            ...(node.marks.code
              ? {
                  font: DOCX_MONO_FONT,
                  shading: { type: ShadingType.CLEAR, fill: DOCX_CODE_SHADING, color: 'auto' },
                }
              : {}),
          }),
        ];
      case InlineKind.LINK:
        return [
          new ExternalHyperlink({
            link: node.href,
            children: renderInline(node.children, rtl, bold),
          }),
        ];
      case InlineKind.BREAK:
        return [new TextRun({ text: '', break: 1 })];
    }
  });
}
