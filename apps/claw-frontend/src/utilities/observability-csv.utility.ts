import type { AdminObsEntityRow } from '@claw/shared-types';

import {
  CSV_BYTE_ORDER_MARK,
  FORMULA_START,
  NEEDS_QUOTES,
} from '@/constants/observability-pages.constants';

/**
 * One CSV cell. A value a spreadsheet would run as a formula (`=`, `+`, `-`, `@`)
 * is prefixed with an apostrophe so an email or name can never execute, and a
 * value with a comma, quote or line break is quoted with quotes doubled.
 */
export function csvCell(value: string | number | null): string {
  if (typeof value === 'number') {
    return String(value);
  }
  const text = value ?? '';
  const safe = FORMULA_START.test(text) ? `'${text}` : text;
  return NEEDS_QUOTES.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

/** Integer micro-USD as a plain decimal (`2.500000`), no currency symbol, for a spreadsheet. */
export function microToPlainUsd(value: string): string {
  try {
    const micro = BigInt(value);
    const whole = micro / 1_000_000n;
    const fraction = (micro % 1_000_000n).toString().padStart(6, '0');
    return `${whole.toString()}.${fraction}`;
  } catch {
    return '';
  }
}

function userCells(user: AdminObsEntityRow): Array<string | number | null> {
  const { metrics } = user;
  return [
    user.userId,
    user.email ?? user.maskedEmail,
    user.username,
    user.role,
    metrics.requests,
    metrics.inputTokens,
    metrics.outputTokens,
    metrics.cachedTokens,
    metrics.toolCalls,
    microToPlainUsd(metrics.cost.costMicroUsd),
    metrics.cost.costKind,
    metrics.lastSeenAt,
  ];
}

/**
 * The users table as CSV text; the header comes from translated labels. The text
 * starts with a UTF-8 byte order mark so Excel reads names in any script correctly.
 */
export function buildUsersCsv(users: AdminObsEntityRow[], header: readonly string[]): string {
  const lines = [header, ...users.map(userCells)].map((cells) =>
    cells.map((cell) => csvCell(cell)).join(','),
  );
  return `${CSV_BYTE_ORDER_MARK}${lines.join('\r\n')}\r\n`;
}

/** Hands `csv` to the browser as a file download. */
export function downloadCsv(csv: string, fileName: string): void {
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
