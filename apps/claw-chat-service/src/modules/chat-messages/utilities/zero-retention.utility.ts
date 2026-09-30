import type { Prisma } from '../../../generated/prisma';
import {
  ZERO_RETENTION_HEADER_ON,
  ZERO_RETENTION_KEPT_METADATA_KEYS,
} from '../constants/zero-retention.constants';

/** True only for the exact value the coding agent sends. A repeated header counts if any copy is on. */
export function isZeroRetentionHeaderOn(value: string | readonly string[] | undefined): boolean {
  if (value === undefined) return false;
  const values = typeof value === 'string' ? [value] : value;
  return values.some((entry) => entry.trim() === ZERO_RETENTION_HEADER_ON);
}

/**
 * The metadata a purged message keeps: identifiers and error codes, plus the
 * `zeroRetention` marker. Anything that could carry text is dropped.
 */
export function redactZeroRetentionMetadata(
  metadata: Prisma.JsonValue | null,
): Prisma.InputJsonObject {
  const kept =
    metadata !== null && typeof metadata === 'object' && !Array.isArray(metadata)
      ? Object.entries(metadata).filter(isKeptEntry)
      : [];
  return { ...Object.fromEntries(kept), zeroRetention: true };
}

/**
 * What a zero-retention log line may say about a failure: the error's class
 * name. A driver message can echo query parameters, which here are content.
 */
export function zeroRetentionErrorName(error: unknown): string {
  return error instanceof Error ? error.name : 'unknown error';
}

function isKeptEntry(
  entry: [string, Prisma.JsonValue | undefined],
): entry is [string, Exclude<Prisma.JsonValue, null>] {
  const [key, value] = entry;
  return ZERO_RETENTION_KEPT_METADATA_KEYS.includes(key) && value !== null && value !== undefined;
}
