import JSZip from 'jszip';

import {
  XLSX_MAIN_NS,
  XLSX_PACKAGE_REL_NS,
  XLSX_REL_NS,
  XLSX_STYLES,
  XLSX_XML_HEADER,
} from '../constants/xlsx.constants';
import {
  XLSX_MAX_COLUMN_WIDTH,
  XLSX_MAX_SHEET_NAME,
  XLSX_MAX_SHEETS,
  XLSX_MIN_COLUMN_WIDTH,
  XLSX_SHEET_NAME_FORBIDDEN,
  XML_INVALID_CHARS,
} from '../constants/document-render.constants';
import { BlockKind } from '../enums/document-node.enum';
import type { DocumentBlock, DocumentMeta, TableBlock } from '../types/markdown-document.types';
import type { SheetSpec } from '../types/office-document.types';
import { tableRows } from './document-table.utility';
import { blockText, flattenBlocks, inlineText, isRightToLeft } from './markdown-document.utility';
import { isPlainNumber } from './spreadsheet-cell.utility';

/**
 * The answer's tables as an Excel workbook (F3b, ADR-108): one sheet per
 * table, named after the heading above it, with a bold frozen header row, an
 * autofilter and real numbers. With no table, one sheet holds the text.
 *
 * Written directly as SpreadsheetML: a workbook is a handful of XML parts, and
 * the popular libraries brought 34 MB of old dependencies. Every text cell is
 * an inline string. The writer has no way to emit a formula, so a model's
 * `=HYPERLINK(...)` is just text.
 */
export async function buildWorkbook(blocks: DocumentBlock[], meta: DocumentMeta): Promise<Buffer> {
  const sheets = sheetsFor(blocks, meta);
  const zip = new JSZip();
  zip.file('[Content_Types].xml', contentTypes(sheets.length));
  zip.file(
    '_rels/.rels',
    `${XLSX_XML_HEADER}<Relationships xmlns="${XLSX_PACKAGE_REL_NS}"><Relationship Id="rId1" Type="${XLSX_REL_NS}/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="${XLSX_PACKAGE_REL_NS}/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`,
  );
  zip.file('docProps/core.xml', coreProperties(meta.title));
  zip.file('xl/workbook.xml', workbook(sheets));
  zip.file('xl/_rels/workbook.xml.rels', workbookRelationships(sheets.length));
  zip.file('xl/styles.xml', XLSX_STYLES);
  for (const [index, sheet] of sheets.entries()) {
    zip.file(`xl/worksheets/sheet${String(index + 1)}.xml`, worksheet(sheet));
  }
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}

/** The sheets an answer becomes: its tables, or its text when it has none. */
export function sheetsFor(blocks: DocumentBlock[], meta: DocumentMeta): SheetSpec[] {
  const sheets: SheetSpec[] = [];
  let heading: string | null = null;
  for (const block of flattenBlocks(blocks)) {
    if (block.kind === BlockKind.HEADING) {
      heading = inlineText(block.content).trim();
    } else if (block.kind === BlockKind.TABLE && sheets.length < XLSX_MAX_SHEETS) {
      sheets.push(tableSheet(block, heading ?? `Table ${String(sheets.length + 1)}`));
      heading = null;
    }
  }
  if (sheets.length === 0) {
    const lines = blocks.map(blockText).filter((line) => line.trim().length > 0);
    sheets.push({
      name: meta.title,
      rows: lines.map((line) => [line]),
      hasHeader: false,
      rtl: meta.rtl,
    });
  }
  return uniqueNames(sheets);
}

/** Excel column letters: 0 → A, 25 → Z, 26 → AA. */
export function columnName(index: number): string {
  let name = '';
  let rest = index + 1;
  while (rest > 0) {
    const digit = (rest - 1) % 26;
    name = String.fromCharCode(65 + digit) + name;
    rest = Math.floor((rest - 1) / 26);
  }
  return name;
}

/** A sheet name Excel accepts: no []:*?/\, not blank, at most 31 characters. */
export function safeSheetName(name: string): string {
  const cleaned = name
    .replaceAll(XLSX_SHEET_NAME_FORBIDDEN, ' ')
    .replaceAll(/^'+|'+$/gu, '')
    .trim();
  return (cleaned.length > 0 ? cleaned : 'Sheet').slice(0, XLSX_MAX_SHEET_NAME);
}

function tableSheet(table: TableBlock, name: string): SheetSpec {
  const rows = tableRows(table);
  return {
    name,
    rows,
    hasHeader: table.header.length > 0,
    rtl: isRightToLeft(rows.flat().join(' ')),
  };
}

function uniqueNames(sheets: SheetSpec[]): SheetSpec[] {
  const used = new Set<string>();
  return sheets.map((sheet) => {
    const base = safeSheetName(sheet.name);
    let name = base;
    for (let copy = 2; used.has(name.toLowerCase()); copy += 1) {
      const suffix = ` (${String(copy)})`;
      name = `${base.slice(0, XLSX_MAX_SHEET_NAME - suffix.length)}${suffix}`;
    }
    used.add(name.toLowerCase());
    return { ...sheet, name };
  });
}

function xml(value: string): string {
  return value
    .replaceAll(XML_INVALID_CHARS, '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function worksheet(sheet: SheetSpec): string {
  const columns = Math.max(...sheet.rows.map((row) => row.length), 1);
  const widths = Array.from({ length: columns }, (_, column) =>
    Math.min(
      XLSX_MAX_COLUMN_WIDTH,
      Math.max(XLSX_MIN_COLUMN_WIDTH, ...sheet.rows.map((row) => (row[column] ?? '').length + 2)),
    ),
  );
  const cols = widths
    .map(
      (width, index) =>
        `<col min="${String(index + 1)}" max="${String(index + 1)}" width="${String(width)}" customWidth="1"/>`,
    )
    .join('');
  const rows = sheet.rows
    .map((row, rowIndex) => {
      const header = sheet.hasHeader && rowIndex === 0;
      const cells = row
        .map((value, column) => cell(`${columnName(column)}${String(rowIndex + 1)}`, value, header))
        .join('');
      return `<row r="${String(rowIndex + 1)}">${cells}</row>`;
    })
    .join('');
  const pane = sheet.hasHeader
    ? '<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>'
    : '';
  const range = `A1:${columnName(columns - 1)}${String(Math.max(sheet.rows.length, 1))}`;
  const filter = sheet.hasHeader && sheet.rows.length > 1 ? `<autoFilter ref="${range}"/>` : '';
  return `${XLSX_XML_HEADER}<worksheet xmlns="${XLSX_MAIN_NS}" xmlns:r="${XLSX_REL_NS}"><sheetViews><sheetView workbookViewId="0"${sheet.rtl ? ' rightToLeft="1"' : ''}>${pane}</sheetView></sheetViews><cols>${cols}</cols><sheetData>${rows}</sheetData>${filter}</worksheet>`;
}

function cell(reference: string, value: string, header: boolean): string {
  const style = header ? ' s="1"' : '';
  if (!header && isPlainNumber(value)) {
    return `<c r="${reference}"${style}><v>${value.trim()}</v></c>`;
  }
  return `<c r="${reference}" t="inlineStr"${style}><is><t xml:space="preserve">${xml(value)}</t></is></c>`;
}

function workbook(sheets: SheetSpec[]): string {
  const entries = sheets
    .map(
      (sheet, index) =>
        `<sheet name="${xml(sheet.name)}" sheetId="${String(index + 1)}" r:id="rId${String(index + 1)}"/>`,
    )
    .join('');
  const filters = sheets
    .map((sheet, index) => {
      const columns = Math.max(...sheet.rows.map((row) => row.length), 1);
      return sheet.hasHeader && sheet.rows.length > 1
        ? `<definedName name="_xlnm._FilterDatabase" localSheetId="${String(index)}" hidden="1">'${xml(sheet.name).replaceAll("'", "''")}'!$A$1:$${columnName(columns - 1)}$${String(sheet.rows.length)}</definedName>`
        : '';
    })
    .join('');
  return `${XLSX_XML_HEADER}<workbook xmlns="${XLSX_MAIN_NS}" xmlns:r="${XLSX_REL_NS}"><sheets>${entries}</sheets>${filters.length > 0 ? `<definedNames>${filters}</definedNames>` : ''}</workbook>`;
}

function workbookRelationships(count: number): string {
  const sheets = Array.from(
    { length: count },
    (_, index) =>
      `<Relationship Id="rId${String(index + 1)}" Type="${XLSX_REL_NS}/worksheet" Target="worksheets/sheet${String(index + 1)}.xml"/>`,
  ).join('');
  return `${XLSX_XML_HEADER}<Relationships xmlns="${XLSX_PACKAGE_REL_NS}">${sheets}<Relationship Id="rId${String(count + 1)}" Type="${XLSX_REL_NS}/styles" Target="styles.xml"/></Relationships>`;
}

function contentTypes(count: number): string {
  const sheets = Array.from(
    { length: count },
    (_, index) =>
      `<Override PartName="/xl/worksheets/sheet${String(index + 1)}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
  ).join('');
  return `${XLSX_XML_HEADER}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>${sheets}</Types>`;
}

function coreProperties(title: string): string {
  return `${XLSX_XML_HEADER}<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>${xml(title)}</dc:title><dc:creator>ClawAI</dc:creator></cp:coreProperties>`;
}
