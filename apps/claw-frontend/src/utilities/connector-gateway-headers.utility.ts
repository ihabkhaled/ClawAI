import {
  GATEWAY_HEADER_FORBIDDEN_NAMES,
  GATEWAY_HEADER_NAME_PATTERN,
  GATEWAY_HEADER_VALUE_FORBIDDEN_PATTERN,
  GATEWAY_HEADER_VALUE_MAX_LENGTH,
  GATEWAY_HEADERS_MAX_COUNT,
} from '@/constants/connector-gateway-headers.constants';
import type { GatewayHeaderRow, GatewayHeaderRowsResult } from '@/types/connector.types';

export function createGatewayHeaderRow(): GatewayHeaderRow {
  return { id: crypto.randomUUID(), name: '', value: '' };
}

function isBlankRow(row: GatewayHeaderRow): boolean {
  return row.name.trim().length === 0 && row.value.length === 0;
}

/**
 * Turns the editor rows into the `gatewayHeaders` request field. Fully blank
 * rows are ignored; any other row must be a valid, non-reserved, unique name
 * with a non-empty single-line value, or the whole set is refused.
 */
export function gatewayHeaderRowsToRecord(
  rows: readonly GatewayHeaderRow[],
): GatewayHeaderRowsResult {
  const filled = rows.filter((row) => !isBlankRow(row));
  if (filled.length > GATEWAY_HEADERS_MAX_COUNT) {
    return { ok: false };
  }
  const headers: Record<string, string> = {};
  const seen = new Set<string>();
  for (const row of filled) {
    const name = row.name.trim();
    const lower = name.toLowerCase();
    const validName =
      GATEWAY_HEADER_NAME_PATTERN.test(name) &&
      !GATEWAY_HEADER_FORBIDDEN_NAMES.has(lower) &&
      !seen.has(lower);
    const validValue =
      row.value.length > 0 &&
      row.value.length <= GATEWAY_HEADER_VALUE_MAX_LENGTH &&
      !GATEWAY_HEADER_VALUE_FORBIDDEN_PATTERN.test(row.value);
    if (!validName || !validValue) {
      return { ok: false };
    }
    seen.add(lower);
    headers[name] = row.value;
  }
  return { ok: true, headers };
}
