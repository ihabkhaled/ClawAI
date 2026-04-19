import type { CatalogDedupRef, InstalledDedupRef } from '../types/discovery.types';
import { buildCanonicalKey } from './model-normalizer.utility';

export function buildCandidateDedupKey(name: string, tag: string): string {
  return buildCanonicalKey(name, tag);
}

export function isDuplicateOfCatalog(
  name: string,
  tag: string,
  catalog: CatalogDedupRef[],
): boolean {
  const key = buildCandidateDedupKey(name, tag);
  for (const entry of catalog) {
    const entryKey = buildCandidateDedupKey(entry.name, entry.tag);
    if (entryKey === key) return true;
    if (entry.ollamaName && entry.ollamaName.trim().length > 0) {
      const ollamaKey = entry.ollamaName.trim().toLowerCase();
      if (ollamaKey === key) return true;
    }
  }
  return false;
}

export function isDuplicateOfInstalled(
  name: string,
  tag: string,
  installed: InstalledDedupRef[],
): boolean {
  const key = buildCandidateDedupKey(name, tag);
  return installed.some((m) => buildCandidateDedupKey(m.name, m.tag) === key);
}
