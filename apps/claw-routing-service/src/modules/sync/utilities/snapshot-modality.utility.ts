import { type ModalityKind } from '../../../generated/prisma';
import {
  KNOWN_MODALITY_KINDS,
  SNAPSHOT_MODALITY_ALIASES,
} from '../constants/snapshot-modality.constants';
import { type UpstreamModelSnapshot } from '../types/sync.types';

function toModalityKind(value: unknown): ModalityKind | null {
  if (typeof value !== 'string') return null;
  const alias = SNAPSHOT_MODALITY_ALIASES.get(value);
  if (alias !== undefined) return alias;
  return KNOWN_MODALITY_KINDS.has(value) ? (value as ModalityKind) : null;
}

/**
 * Maps a modality list from an upstream snapshot onto `ModalityKind`,
 * translating aliases and dropping anything unknown, de-duplicated.
 * An unknown string must never reach Prisma: one bad member fails the whole
 * row's upsert.
 */
export function normalizeSnapshotModalities(
  values: ReadonlyArray<unknown> | undefined,
): ModalityKind[] | undefined {
  if (values === undefined) return undefined;
  const mapped = new Set<ModalityKind>();
  for (const value of values) {
    const kind = toModalityKind(value);
    if (kind !== null) mapped.add(kind);
  }
  return [...mapped];
}

/** Applies {@link normalizeSnapshotModalities} to both directions of a snapshot row. */
export function normalizeSnapshotRow(row: UpstreamModelSnapshot): UpstreamModelSnapshot {
  const modalitiesIn = normalizeSnapshotModalities(row.modalitiesIn);
  const modalitiesOut = normalizeSnapshotModalities(row.modalitiesOut);
  return {
    ...row,
    ...(modalitiesIn === undefined ? {} : { modalitiesIn }),
    ...(modalitiesOut === undefined ? {} : { modalitiesOut }),
  };
}
