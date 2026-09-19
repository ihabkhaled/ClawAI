import PptxGenJS from 'pptxgenjs';

import {
  PPTX_MAX_LINES_PER_SLIDE,
  PPTX_MONO_FONT,
  PPTX_TITLE_FONT,
} from '../constants/document-render.constants';
import { BlockKind } from '../enums/document-node.enum';
import type { DocumentBlock, DocumentMeta } from '../types/markdown-document.types';
import type { SlideLine, SlideSpec } from '../types/office-document.types';
import { tableRows } from './document-table.utility';
import { blockText, inlineText, isRightToLeft } from './markdown-document.utility';

/**
 * The answer as a slide deck (F3b, ADR-108). The first heading is the title
 * slide, and every later heading starts a slide. Text that would overflow
 * continues on a "(cont.)" slide, and tables and code get their own slides.
 */
export async function buildDeck(blocks: DocumentBlock[], meta: DocumentMeta): Promise<Buffer> {
  const deck = new PptxGenJS();
  deck.layout = 'LAYOUT_WIDE';
  deck.title = meta.title;
  deck.author = 'ClawAI';

  const title = deck.addSlide();
  title.addText(meta.title, {
    x: 0.6,
    y: 2.6,
    w: 12.1,
    h: 1.6,
    fontFace: PPTX_TITLE_FONT,
    fontSize: 40,
    bold: true,
    align: meta.rtl ? 'right' : 'left',
    rtlMode: meta.rtl,
  });

  for (const spec of slidesFor(blocks, meta)) {
    addSlide(deck, spec);
  }
  const output = await deck.write({ outputType: 'nodebuffer' });
  return Buffer.isBuffer(output) ? output : Buffer.from(String(output));
}

/** The slides after the title slide, split so none overflows. */
export function slidesFor(blocks: DocumentBlock[], meta: DocumentMeta): SlideSpec[] {
  const slides: SlideSpec[] = [];
  let current: SlideSpec | null = null;
  let sawTitleHeading = false;
  const open = (heading: string): SlideSpec => {
    const slide: SlideSpec = {
      title: heading,
      lines: [],
      table: null,
      code: null,
      rtl: isRightToLeft(heading),
    };
    slides.push(slide);
    return slide;
  };

  for (const block of blocks) {
    if (block.kind === BlockKind.HEADING) {
      const heading = inlineText(block.content).trim();
      // The document's own title is already the title slide.
      if (!sawTitleHeading && heading === meta.title) {
        sawTitleHeading = true;
        continue;
      }
      current = open(heading);
    } else if (block.kind === BlockKind.TABLE) {
      const table = open(current?.title ?? meta.title);
      table.table = tableRows(block);
      table.rtl = isRightToLeft(blockText(block));
    } else if (block.kind === BlockKind.CODE) {
      const code = open(current?.title ?? meta.title);
      code.code = block.text;
    } else {
      current ??= open(meta.title);
      current.lines.push(...linesOf(block, 0));
      current.rtl ||= isRightToLeft(blockText(block));
    }
  }
  return slides
    .flatMap(splitOverflow)
    .filter((slide) => slide.lines.length > 0 || slide.table !== null || slide.code !== null);
}

function linesOf(block: DocumentBlock, level: number): SlideLine[] {
  switch (block.kind) {
    case BlockKind.PARAGRAPH:
      return [{ text: inlineText(block.content), level, bold: false }];
    case BlockKind.LIST:
      return block.items.flatMap((item) => item.flatMap((child) => linesOf(child, level + 1)));
    case BlockKind.QUOTE:
      return block.blocks.flatMap((child) => linesOf(child, level));
    case BlockKind.HEADING:
      return [{ text: inlineText(block.content), level, bold: true }];
    case BlockKind.CODE:
    case BlockKind.TABLE:
    case BlockKind.RULE:
      return [];
  }
}

function splitOverflow(slide: SlideSpec): SlideSpec[] {
  if (slide.lines.length <= PPTX_MAX_LINES_PER_SLIDE) {
    return [slide];
  }
  const parts: SlideSpec[] = [];
  for (let start = 0; start < slide.lines.length; start += PPTX_MAX_LINES_PER_SLIDE) {
    parts.push({
      ...slide,
      title: start === 0 ? slide.title : `${slide.title} (cont.)`,
      lines: slide.lines.slice(start, start + PPTX_MAX_LINES_PER_SLIDE),
    });
  }
  return parts;
}

function addSlide(deck: PptxGenJS, spec: SlideSpec): void {
  const slide = deck.addSlide();
  const align = spec.rtl ? 'right' : 'left';
  slide.addText(spec.title, {
    x: 0.5,
    y: 0.3,
    w: 12.3,
    h: 0.9,
    fontFace: PPTX_TITLE_FONT,
    fontSize: 28,
    bold: true,
    align,
    rtlMode: spec.rtl,
  });
  if (spec.table !== null) {
    slide.addTable(
      spec.table.map((row, index) =>
        row.map((text) => ({
          text,
          options: { bold: index === 0, align, fill: { color: index === 0 ? 'E7E6E6' : 'FFFFFF' } },
        })),
      ),
      {
        x: 0.5,
        y: 1.4,
        w: 12.3,
        fontSize: 14,
        border: { type: 'solid', pt: 0.5, color: 'BFBFBF' },
      },
    );
  } else if (spec.code !== null) {
    slide.addText(spec.code, {
      x: 0.5,
      y: 1.4,
      w: 12.3,
      h: 5.6,
      fontFace: PPTX_MONO_FONT,
      fontSize: 14,
      valign: 'top',
      fill: { color: 'F2F2F2' },
    });
  } else {
    slide.addText(
      spec.lines.map((line) => ({
        text: line.text,
        options: {
          bullet: line.level > 0 ? { indent: 18 } : false,
          indentLevel: Math.max(line.level - 1, 0),
          bold: line.bold,
          breakLine: true,
        },
      })),
      {
        x: 0.5,
        y: 1.4,
        w: 12.3,
        h: 5.6,
        fontFace: PPTX_TITLE_FONT,
        fontSize: 20,
        valign: 'top',
        align,
        rtlMode: spec.rtl,
      },
    );
  }
}
