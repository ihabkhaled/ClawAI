// The list filter must select exactly the rows the list SHOWS with that status.
// Proven by evaluating the generated Prisma condition with SQL three-valued
// logic (NULL-aware, so the `NOT (text LIKE …)` trap is caught) against every
// combination of the columns the mapping reads, and comparing with
// `resolveEffectiveIngestionStatus` under the owner-facing ceiling.

import { describe, expect, it } from 'vitest';

import { FileIngestionStatus, type Prisma } from '../../../../generated/prisma';
import { OWNER_PLACEHOLDER_PROCESSING_CEILING_MS } from '../../constants/effective-ingestion.constants';
import { type EffectiveIngestionRow } from '../../types/effective-ingestion.types';
import { effectiveIngestionStatusWhere } from '../effective-ingestion-filter.utility';
import { resolveEffectiveIngestionStatus } from '../effective-ingestion.utility';

const NOW = Date.parse('2026-09-25T12:00:00Z');
const CUTOFF = NOW - OWNER_PLACEHOLDER_PROCESSING_CEILING_MS;

const and3 = (values: (boolean | null)[]): boolean | null => {
  if (values.includes(false)) {
    return false;
  }
  return values.includes(null) ? null : true;
};
const or3 = (values: (boolean | null)[]): boolean | null => {
  if (values.includes(true)) {
    return true;
  }
  return values.includes(null) ? null : false;
};
const not3 = (value: boolean | null): boolean | null => (value === null ? null : !value);
const toList = (
  input: Prisma.FileWhereInput | Prisma.FileWhereInput[] | undefined,
): Prisma.FileWhereInput[] => {
  if (input === undefined) {
    return [];
  }
  return Array.isArray(input) ? input : [input];
};

/** `column LIKE 'prefix%'`, NULL when the column is NULL. */
const like = (column: string | null, prefix: unknown): boolean | null => {
  if (column === null) {
    return null;
  }
  return typeof prefix === 'string' ? column.startsWith(prefix) : true;
};

const nullableText = (
  filter: string | Prisma.StringNullableFilter<'File'> | null | undefined,
  column: string | null,
): boolean | null => {
  if (filter === undefined) {
    return true;
  }
  if (filter === null) {
    return column === null;
  }
  if (typeof filter === 'string') {
    return column === null ? null : column === filter;
  }
  return filter.not === null ? column !== null : like(column, filter.startsWith);
};

const dateFilter = (
  filter: Prisma.DateTimeFilter<'File'> | Date | string | undefined,
  column: Date,
): boolean => {
  if (filter === undefined || typeof filter === 'string' || filter instanceof Date) {
    return filter === undefined;
  }
  const at = column.getTime();
  const gte = filter.gte instanceof Date ? at >= filter.gte.getTime() : true;
  const lt = filter.lt instanceof Date ? at < filter.lt.getTime() : true;
  return gte && lt;
};

function evaluate(where: Prisma.FileWhereInput, row: EffectiveIngestionRow): boolean | null {
  const status = where.ingestionStatus;
  const mime = where.mimeType;
  return and3([
    status === undefined || typeof status === 'string'
      ? (status ?? row.ingestionStatus) === row.ingestionStatus
      : false,
    mime === undefined || typeof mime === 'string'
      ? mime === undefined || mime === row.mimeType
      : like(row.mimeType, mime.startsWith),
    nullableText(where.extractedText, row.extractedText),
    nullableText(where.extractionError, row.extractionError),
    dateFilter(where.updatedAt, row.updatedAt),
    and3(toList(where.AND).map((inner) => evaluate(inner, row))),
    where.OR === undefined ? true : or3(where.OR.map((inner) => evaluate(inner, row))),
    and3(toList(where.NOT).map((inner) => not3(evaluate(inner, row)))),
  ]);
}

const MIME_TYPES = ['video/mp4', 'audio/mpeg', 'application/pdf'];
const TEXTS = [null, '[Video file: a.mp4]', '[Audio file: a.mp3]', 'real text'];
const ERRORS = [null, 'CODE: reason'];
const UPDATED = [new Date(NOW - 1_000), new Date(CUTOFF), new Date(CUTOFF - 1), new Date(0)];
const STATUSES = [
  FileIngestionStatus.PENDING,
  FileIngestionStatus.PROCESSING,
  FileIngestionStatus.COMPLETED,
  FileIngestionStatus.FAILED,
];

const ROWS: EffectiveIngestionRow[] = MIME_TYPES.flatMap((mimeType) =>
  STATUSES.flatMap((ingestionStatus) =>
    TEXTS.flatMap((extractedText) =>
      ERRORS.flatMap((extractionError) =>
        UPDATED.map((updatedAt) => ({
          mimeType,
          ingestionStatus,
          extractedText,
          extractionError,
          updatedAt,
        })),
      ),
    ),
  ),
);

const shown = (row: EffectiveIngestionRow): FileIngestionStatus =>
  resolveEffectiveIngestionStatus(row, {
    ceilingMs: OWNER_PLACEHOLDER_PROCESSING_CEILING_MS,
    now: NOW,
  });

describe('effectiveIngestionStatusWhere', () => {
  it.each(STATUSES)('%s selects exactly the rows the owner is shown as %s', (status) => {
    const where = effectiveIngestionStatusWhere(status, NOW);
    for (const row of ROWS) {
      expect({ row, matched: evaluate(where, row) === true }).toEqual({
        row,
        matched: shown(row) === status,
      });
    }
  });

  it('puts every row under exactly one status filter', () => {
    for (const row of ROWS) {
      const matches = STATUSES.filter(
        (status) => evaluate(effectiveIngestionStatusWhere(status, NOW), row) === true,
      );
      expect(matches).toHaveLength(1);
    }
  });

  it('PROCESSING includes a fresh placeholder video stored COMPLETED; COMPLETED excludes it', () => {
    const video: EffectiveIngestionRow = {
      mimeType: 'video/mp4',
      ingestionStatus: FileIngestionStatus.COMPLETED,
      extractedText: '[Video file: clip.mp4]',
      extractionError: null,
      updatedAt: new Date(NOW - 60_000),
    };
    expect(
      evaluate(effectiveIngestionStatusWhere(FileIngestionStatus.PROCESSING, NOW), video),
    ).toBe(true);
    expect(
      evaluate(effectiveIngestionStatusWhere(FileIngestionStatus.COMPLETED, NOW), video),
    ).not.toBe(true);
  });

  it('keeps a COMPLETED row with no text under COMPLETED (the SQL NULL trap)', () => {
    const empty: EffectiveIngestionRow = {
      mimeType: 'video/mp4',
      ingestionStatus: FileIngestionStatus.COMPLETED,
      extractedText: null,
      extractionError: null,
      updatedAt: new Date(NOW),
    };
    expect(evaluate(effectiveIngestionStatusWhere(FileIngestionStatus.COMPLETED, NOW), empty)).toBe(
      true,
    );
  });

  it('PENDING stays the stored column', () => {
    expect(effectiveIngestionStatusWhere(FileIngestionStatus.PENDING, NOW)).toEqual({
      ingestionStatus: FileIngestionStatus.PENDING,
    });
  });
});
