import { BadRequestException } from '@nestjs/common';

import { CURSOR_NUMERIC_PATTERN } from '../constants/admin-usage-explorer.constants';
import { type ExplorerCursor } from '../types/admin-usage-explorer.types';

/** Opaque keyset cursor: the last row's sort value and key. */
export function encodeCursor(value: string, id: string): string {
  return Buffer.from(JSON.stringify({ v: value, id }), 'utf8').toString('base64url');
}

function invalidCursor(): BadRequestException {
  return new BadRequestException({ message: 'cursor is invalid', code: 'USAGE_CURSOR_INVALID' });
}

/** Rejects anything that is not a cursor this service issued: the sort value is cast to numeric in SQL. */
export function decodeCursor(raw: string | undefined): ExplorerCursor | null {
  if (raw === undefined) {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'));
  } catch {
    throw invalidCursor();
  }
  if (typeof parsed !== 'object' || parsed === null) {
    throw invalidCursor();
  }
  const { v, id } = parsed as Record<string, unknown>;
  if (
    typeof v !== 'string' ||
    typeof id !== 'string' ||
    !CURSOR_NUMERIC_PATTERN.test(v) ||
    id === ''
  ) {
    throw invalidCursor();
  }
  return { v, id };
}
