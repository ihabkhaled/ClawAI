import { Injectable } from '@nestjs/common';

import {
  SCRAPE_SCRIPT_STYLE_RE,
  SCRAPE_TABLE_CELL_RE,
  SCRAPE_TABLE_MAX_ROWS,
  SCRAPE_TABLE_MAX_TABLES,
  SCRAPE_TABLE_RE,
  SCRAPE_TABLE_ROW_RE,
  SCRAPE_TAG_RE,
  SCRAPE_TEXT_MAX_CHARS,
  SCRAPE_WS_RE,
} from '../constants/scrape-patterns.constants';
import { ExtractionProfile } from '../enums/extraction-profile.enum';
import { decodeEntitiesAndStrip } from '../utilities/scrape-text.utility';
import type { ScrapeAdapter } from './scrape-adapter.interface';
import type { ScrapeInput, ScrapeOutput } from '../types/scrape.types';

type Row = { cells: string[]; isHeader: boolean };
type ParsedTable = { headers: string[]; rows: string[][] };

@Injectable()
export class TableExtractor implements ScrapeAdapter {
  readonly profileName = 'table';

  extract(input: ScrapeInput): ScrapeOutput {
    const warnings: string[] = [];
    const denoised = input.html.replaceAll(SCRAPE_SCRIPT_STYLE_RE, ' ');
    const tables = parseTables(denoised);
    const text = denoised.replaceAll(SCRAPE_TAG_RE, ' ').replaceAll(SCRAPE_WS_RE, ' ').trim();

    const truncated = text.length > SCRAPE_TEXT_MAX_CHARS;
    if (truncated) {
      warnings.push('text_truncated');
    }

    return {
      profile: ExtractionProfile.TABLE,
      title: null,
      text: truncated ? text.slice(0, SCRAPE_TEXT_MAX_CHARS) : text,
      structured: { tables },
      warnings,
    };
  }
}

function parseTables(html: string): ParsedTable[] {
  const out: ParsedTable[] = [];
  const tableRe = new RegExp(SCRAPE_TABLE_RE.source, 'gi');
  let tableMatch: RegExpExecArray | null;
  while ((tableMatch = tableRe.exec(html)) !== null) {
    if (out.length >= SCRAPE_TABLE_MAX_TABLES) {
      break;
    }
    const parsed = parseTableBody(tableMatch[0]);
    out.push(parsed);
  }
  return out;
}

function parseTableBody(tableHtml: string): ParsedTable {
  const rows: Row[] = [];
  const rowRe = new RegExp(SCRAPE_TABLE_ROW_RE.source, 'gi');
  let rowMatch: RegExpExecArray | null;
  while ((rowMatch = rowRe.exec(tableHtml)) !== null) {
    if (rows.length >= SCRAPE_TABLE_MAX_ROWS) {
      break;
    }
    rows.push(parseRow(rowMatch[0]));
  }

  const firstHeaderRow = rows.find((r) => r.isHeader);
  const headers = firstHeaderRow?.cells ?? [];
  const body = rows.filter((r) => r !== firstHeaderRow).map((r) => r.cells);
  return { headers, rows: body };
}

function parseRow(rowHtml: string): Row {
  const cells: string[] = [];
  let hasTh = false;
  let hasTd = false;
  const re = new RegExp(SCRAPE_TABLE_CELL_RE.source, 'gi');
  let match: RegExpExecArray | null;
  while ((match = re.exec(rowHtml)) !== null) {
    const tag = match[1];
    const inner = match[2];
    if (tag === undefined || inner === undefined) {
      continue;
    }
    if (tag.toLowerCase() === 'th') {
      hasTh = true;
    } else {
      hasTd = true;
    }
    cells.push(decodeEntitiesAndStrip(inner));
  }
  const isHeader = hasTh && !hasTd;
  return { cells, isHeader };
}
