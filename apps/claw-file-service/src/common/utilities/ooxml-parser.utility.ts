// OOXML (XLSX / PPTX) text extraction.
//
// Both formats are ZIP containers full of XML parts, so `buffer.toString('utf-8')`
// on one yields deflate noise — which is exactly what this service used to feed
// the models for a spreadsheet. These two functions read the parts that actually
// carry user-visible text and flatten them to something a language model can read.
//
// Deliberately built on `node-stream-zip`, which this service already depends on
// for archive expansion, rather than pulling in a spreadsheet library. We need
// text, not formulas, styles, charts or cell types; a full workbook parser would
// be a large dependency for a small slice of its surface. See
// docs/13-adr/adr-095-attachment-text-extraction-pipeline.md.
//
// An .xlsx IS a ZIP and IS user input, so every entry read here is bounded the
// same way ADR-053 bounds the archive-expansion path: a 2 MB workbook whose
// sharedStrings.xml inflates to several gigabytes is the exact attack that
// pipeline exists to stop, and a second unguarded way to open an archive would
// be a hole in it. The bounds differ in shape only — there is no extraction to
// disk here, so the limits are per-entry and total in-memory bytes.

import { HttpStatus, Logger } from '@nestjs/common';
import StreamZip from 'node-stream-zip';
import { BusinessException } from '../errors/business.exception';
import { elementsOf } from './xml-elements.utility';
import {
  DOCX_DOCUMENT_ENTRY,
  OOXML_MAX_ENTRY_COUNT,
  OOXML_MAX_TOTAL_TEXT_BYTES,
  OOXML_MAX_UNCOMPRESSED_ENTRY_BYTES,
  PPTX_NOTES_ENTRY_PATTERN,
  PPTX_SLIDE_ENTRY_PATTERN,
  XLSX_SHARED_STRINGS_ENTRY,
  XLSX_WORKBOOK_ENTRY,
  XLSX_WORKSHEET_ENTRY_PATTERN,
} from '../../modules/files/constants/ooxml.constants';

const logger = new Logger('OoxmlParserUtility');

/**
 * Flattens a workbook to one tab-separated line per row, grouped by sheet.
 *
 * Shared strings are resolved so cells read as their text rather than as the
 * integer index Excel stores in the sheet part. Sheet names are emitted as
 * headings so a model can cite "the Q3 Revenue sheet" instead of "sheet 1".
 */
export async function extractTextFromXlsx(filePath: string): Promise<string> {
  logger.debug(`extractTextFromXlsx: reading ${filePath}`);
  const zip = new StreamZip.async({ file: filePath, storeEntries: true });
  try {
    const entryNames = await readEntryNames(zip);
    const budget = new EntryBudget();
    const sharedStrings = await readSharedStrings(zip, entryNames, budget);
    const sheetNames = await readSheetNames(zip, entryNames, budget);

    const worksheetEntries = entryNames
      .filter((name) => XLSX_WORKSHEET_ENTRY_PATTERN.test(name))
      .sort(byTrailingNumber);

    const blocks: string[] = [];
    for (const [index, entryName] of worksheetEntries.entries()) {
      const xml = await readEntryText(zip, entryName, budget);
      const rows = parseSheetRows(xml, sharedStrings);
      if (rows.length === 0) {
        continue;
      }
      const heading = sheetNames.at(index) ?? `Sheet ${String(index + 1)}`;
      blocks.push(`# Sheet: ${heading}\n${rows.join('\n')}`);
    }

    const text = blocks.join('\n\n');
    logger.debug(
      `extractTextFromXlsx: ${String(worksheetEntries.length)} sheet(s), ${String(text.length)} chars`,
    );
    return text;
  } finally {
    await closeQuietly(zip);
  }
}

/**
 * Flattens a document to one line per paragraph, tabs and line breaks kept.
 *
 * Read here rather than by mammoth, which inflates with no caps: this path opens
 * the archive once, with the same bounded reader as the workbook and the deck, so
 * the check and the read cannot disagree about what the archive holds. Body text
 * only; headers, footers, notes and comments are not read.
 */
export async function extractTextFromDocxBounded(filePath: string): Promise<string> {
  logger.debug(`extractTextFromDocxBounded: reading ${filePath}`);
  const zip = new StreamZip.async({ file: filePath, storeEntries: true });
  try {
    const entryNames = await readEntryNames(zip);
    if (!entryNames.includes(DOCX_DOCUMENT_ENTRY)) {
      return '';
    }
    const xml = await readEntryText(zip, DOCX_DOCUMENT_ENTRY, new EntryBudget());
    return parseWordParagraphs(xml).join('\n');
  } finally {
    await closeQuietly(zip);
  }
}

/**
 * Flattens a deck to one block per slide, in slide order, with speaker notes.
 *
 * Notes matter more than they look: a deck's argument frequently lives in the
 * notes while the slide itself carries three words and a chart.
 */
export async function extractTextFromPptx(filePath: string): Promise<string> {
  logger.debug(`extractTextFromPptx: reading ${filePath}`);
  const zip = new StreamZip.async({ file: filePath, storeEntries: true });
  try {
    const entryNames = await readEntryNames(zip);
    const budget = new EntryBudget();
    const slideEntries = entryNames
      .filter((name) => PPTX_SLIDE_ENTRY_PATTERN.test(name))
      .sort(byTrailingNumber);
    const noteEntries = entryNames
      .filter((name) => PPTX_NOTES_ENTRY_PATTERN.test(name))
      .sort(byTrailingNumber);

    const notesBySlide = new Map<number, string>();
    for (const entryName of noteEntries) {
      const xml = await readEntryText(zip, entryName, budget);
      const paragraphs = parseDrawingParagraphs(xml);
      if (paragraphs.length > 0) {
        notesBySlide.set(trailingNumber(entryName), paragraphs.join('\n'));
      }
    }

    const blocks: string[] = [];
    for (const [index, entryName] of slideEntries.entries()) {
      const xml = await readEntryText(zip, entryName, budget);
      const paragraphs = parseDrawingParagraphs(xml);
      const notes = notesBySlide.get(trailingNumber(entryName));
      if (paragraphs.length === 0 && notes === undefined) {
        continue;
      }
      const lines = [`# Slide ${String(index + 1)}`, ...paragraphs];
      if (notes !== undefined) {
        lines.push(`Speaker notes: ${notes}`);
      }
      blocks.push(lines.join('\n'));
    }

    const text = blocks.join('\n\n');
    logger.debug(
      `extractTextFromPptx: ${String(slideEntries.length)} slide(s), ${String(text.length)} chars`,
    );
    return text;
  } finally {
    await closeQuietly(zip);
  }
}

async function readSharedStrings(
  zip: StreamZip.StreamZipAsync,
  entryNames: string[],
  budget: EntryBudget,
): Promise<string[]> {
  if (!entryNames.includes(XLSX_SHARED_STRINGS_ENTRY)) {
    return [];
  }
  const xml = await readEntryText(zip, XLSX_SHARED_STRINGS_ENTRY, budget);
  // A <si> may hold one <t>, or several when Excel splits a run-formatted
  // string; concatenating the runs restores the cell's original text.
  return elementsOf(xml, 'si').map((item) =>
    elementsOf(item.inner, 't')
      .map((run) => decodeXmlEntities(run.inner))
      .join(''),
  );
}

async function readSheetNames(
  zip: StreamZip.StreamZipAsync,
  entryNames: string[],
  budget: EntryBudget,
): Promise<string[]> {
  if (!entryNames.includes(XLSX_WORKBOOK_ENTRY)) {
    return [];
  }
  const xml = await readEntryText(zip, XLSX_WORKBOOK_ENTRY, budget);
  return [...xml.matchAll(/<sheet\b[^<>]*\bname="([^"]*)"/g)].map((match) =>
    decodeXmlEntities(match[1] ?? ''),
  );
}

function parseSheetRows(xml: string, sharedStrings: string[]): string[] {
  const rows: string[] = [];
  for (const row of elementsOf(xml, 'row')) {
    const cells = elementsOf(row.inner, 'c').map((cell) =>
      readCellValue(cell.attributes, cell.inner, sharedStrings),
    );
    // A row of nothing but empty cells is layout, not content.
    if (cells.some((cell) => cell.length > 0)) {
      rows.push(cells.join('\t'));
    }
  }
  return rows;
}

function readCellValue(attributes: string, body: string, sharedStrings: string[]): string {
  const type = /\bt="([^"]*)"/.exec(attributes)?.[1];

  if (type === 'inlineStr') {
    return elementsOf(body, 't')
      .map((run) => decodeXmlEntities(run.inner))
      .join('');
  }

  const rawValue = elementsOf(body, 'v').at(0)?.inner;
  if (rawValue === undefined) {
    return '';
  }

  if (type === 's') {
    const index = Number.parseInt(rawValue, 10);
    // An out-of-range index means a malformed workbook; showing the raw index
    // would be worse than showing nothing, so the cell reads as empty. `.at` is
    // used rather than a bracket read because a shared-string index comes
    // straight out of the uploaded file and must not reach a property lookup.
    return !Number.isInteger(index) || index < 0 ? '' : (sharedStrings.at(index) ?? '');
  }

  return decodeXmlEntities(rawValue);
}

/**
 * WordprocessingML paragraphs, one string per `<w:p>`.
 *
 * `<w:t>` holds only text (no nested tags), so a self-closing `<w:t/>` is not
 * matched and cannot swallow the runs after it.
 */
function parseWordParagraphs(xml: string): string[] {
  const paragraphs: string[] = [];
  for (const paragraph of elementsOf(xml, 'w:p')) {
    // `[^<>]*` and `[^<]*` stop at the next tag, so a failed attempt never
    // reads past it: no start re-scans what an earlier one already covered.
    const text = [
      ...paragraph.inner.matchAll(
        /<w:t(?=[\s>])[^<>]*>([^<]*)<\/w:t>|<w:tab\s*\/>|<w:br\b[^<>]*\/>/g,
      ),
    ]
      .map((part) => {
        if (part[1] !== undefined) return decodeXmlEntities(part[1]);
        return part[0].startsWith('<w:tab') ? '\t' : '\n';
      })
      .join('')
      .trim();
    if (text.length > 0) {
      paragraphs.push(text);
    }
  }
  return paragraphs;
}

/**
 * DrawingML paragraphs, one string per `<a:p>`.
 *
 * Runs inside a paragraph are concatenated with no separator because a run
 * boundary is a formatting change, not a word boundary — splitting there turns
 * "Local-first inference" into two fragments.
 */
function parseDrawingParagraphs(xml: string): string[] {
  const paragraphs: string[] = [];
  for (const paragraph of elementsOf(xml, 'a:p')) {
    const text = elementsOf(paragraph.inner, 'a:t')
      .map((run) => decodeXmlEntities(run.inner))
      .join('')
      .trim();
    if (text.length > 0) {
      paragraphs.push(text);
    }
  }
  return paragraphs;
}

// `slide10.xml` must sort after `slide2.xml`. A plain string sort puts it
// second, which silently reorders any deck or workbook with ten or more parts.
function byTrailingNumber(a: string, b: string): number {
  return trailingNumber(a) - trailingNumber(b);
}

function trailingNumber(entryName: string): number {
  const digits = /(\d+)\.xml$/.exec(entryName)?.[1];
  return digits === undefined ? 0 : Number.parseInt(digits, 10);
}

/**
 * Tracks how much text one document has been allowed to produce.
 *
 * A per-entry cap alone is not enough: a deck with ten thousand slides, each
 * just under the entry limit, defeats it. The budget is carried across every
 * read for one file so the total is bounded too.
 */
class EntryBudget {
  private remaining = OOXML_MAX_TOTAL_TEXT_BYTES;

  spend(bytes: number, entryName: string): void {
    this.remaining -= bytes;
    if (this.remaining < 0) {
      throw new BusinessException(
        `Document text exceeds ${String(OOXML_MAX_TOTAL_TEXT_BYTES)} bytes (at ${entryName})`,
        'OOXML_TEXT_TOO_LARGE',
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}

/**
 * Reads one archive entry, refusing anything that inflates past the caps.
 *
 * The declared uncompressed size is checked BEFORE inflating, so a zip bomb is
 * rejected on its header rather than after it has already filled memory.
 */
async function readEntryText(
  zip: StreamZip.StreamZipAsync,
  entryName: string,
  budget: EntryBudget,
): Promise<string> {
  const entry = await zip.entry(entryName);
  const declaredSize = entry?.size ?? 0;
  if (declaredSize > OOXML_MAX_UNCOMPRESSED_ENTRY_BYTES) {
    throw new BusinessException(
      `Archive entry ${entryName} declares ${String(declaredSize)} bytes (limit ${String(OOXML_MAX_UNCOMPRESSED_ENTRY_BYTES)})`,
      'OOXML_ENTRY_TOO_LARGE',
      HttpStatus.BAD_REQUEST,
    );
  }

  const data = await zip.entryData(entryName);
  // The header is a claim, not a guarantee; the inflated buffer is the truth.
  if (data.length > OOXML_MAX_UNCOMPRESSED_ENTRY_BYTES) {
    throw new BusinessException(
      `Archive entry ${entryName} inflated to ${String(data.length)} bytes (limit ${String(OOXML_MAX_UNCOMPRESSED_ENTRY_BYTES)})`,
      'OOXML_ENTRY_TOO_LARGE',
      HttpStatus.BAD_REQUEST,
    );
  }
  budget.spend(data.length, entryName);
  return data.toString('utf8');
}

/**
 * The archive's part names, after the checks every reader needs.
 *
 * The count is the central directory's own, so a duplicated name cannot shrink it,
 * and an archive that repeats a name is refused: two parts under one name are read
 * differently by different zip libraries, which is how a part hides from a check.
 */
async function readEntryNames(zip: StreamZip.StreamZipAsync): Promise<string[]> {
  const entryNames = Object.keys(await zip.entries());
  assertEntryCountWithinLimit(entryNames, await zip.entriesCount);
  if ((await zip.entriesCount) !== entryNames.length) {
    throw new BusinessException(
      'Archive repeats an entry name',
      'OOXML_DUPLICATE_ENTRY',
      HttpStatus.BAD_REQUEST,
    );
  }
  return entryNames;
}

/**
 * Rejects an archive with an implausible number of parts before any read.
 *
 * A real workbook or deck has tens of parts. Tens of thousands means a crafted
 * file, and the cost of discovering that one entry at a time is the attack.
 */
function assertEntryCountWithinLimit(entryNames: string[], declaredCount: number): void {
  const count = Math.max(entryNames.length, declaredCount);
  if (count > OOXML_MAX_ENTRY_COUNT) {
    throw new BusinessException(
      `Archive has ${String(count)} entries (limit ${String(OOXML_MAX_ENTRY_COUNT)})`,
      'OOXML_TOO_MANY_ENTRIES',
      HttpStatus.BAD_REQUEST,
    );
  }
}

function decodeXmlEntities(value: string): string {
  return value
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'")
    .replaceAll(/&#x([0-9a-fA-F]+);/g, (_, hex: string) =>
      String.fromCodePoint(Number.parseInt(hex, 16)),
    )
    .replaceAll(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(Number.parseInt(dec, 10)))
    .replaceAll('&amp;', '&');
}

async function closeQuietly(zip: StreamZip.StreamZipAsync): Promise<void> {
  try {
    await zip.close();
  } catch (error: unknown) {
    logger.warn(
      `closeQuietly: failed to close archive — ${error instanceof Error ? error.message : 'unknown'}`,
    );
  }
}
