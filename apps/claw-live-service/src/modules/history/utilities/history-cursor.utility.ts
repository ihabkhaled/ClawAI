import { BadRequestException } from '@nestjs/common';

import { LiveHistoryErrorCode } from '../../../common/enums/live-history-error-code.enum';
import type { HistoryCursor } from '../types/history.types';

/** Opaque cursor: base64url of the (sort key, id) pair of the last row of a page. */
export function encodeHistoryCursor(at: string, id: string): string {
  return Buffer.from(JSON.stringify({ at, id }), 'utf8').toString('base64url');
}

export function decodeHistoryCursor(raw: string | undefined): HistoryCursor | null {
  if (raw === undefined) return null;
  try {
    const parsed: unknown = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'));
    if (typeof parsed === 'object' && parsed !== null) {
      const { at, id } = parsed as { at?: unknown; id?: unknown };
      if (typeof at === 'string' && typeof id === 'string' && at !== '' && id !== '') {
        return { at, id };
      }
    }
  } catch {
    // fall through to the refusal below
  }
  throw new BadRequestException(LiveHistoryErrorCode.INVALID_CURSOR);
}
