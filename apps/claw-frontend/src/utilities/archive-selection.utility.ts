import type { ArchiveSelectionInput, ArchiveSelectionResult } from '@/types/archive.types';

/**
 * One rule keeps an archive from reaching the model twice.
 *
 * The whole archive's manifest already carries the text of every file inside
 * it, so attaching the archive AND a file from it sends that file twice — and
 * pays for it twice. So the two are mutually exclusive:
 *   - picking a file inside an archive drops the archive itself (and any
 *     archive further out that contains it);
 *   - picking an archive drops every file already picked from inside it.
 * Unchecking only removes the one id.
 */
export function applyArchiveSelection(input: ArchiveSelectionInput): ArchiveSelectionResult {
  const ancestry = new Map(input.ancestryById);
  if (!input.checked) {
    ancestry.delete(input.targetId);
    return {
      selectedIds: input.selectedIds.filter((id) => id !== input.targetId),
      ancestryById: ancestry,
    };
  }

  const ancestors = new Set(input.ancestorIds);
  const kept: string[] = [];
  for (const id of input.selectedIds) {
    const isInsideTarget = (ancestry.get(id) ?? []).includes(input.targetId);
    if (id === input.targetId || ancestors.has(id) || isInsideTarget) {
      ancestry.delete(id);
      continue;
    }
    kept.push(id);
  }
  if (input.ancestorIds.length > 0) {
    ancestry.set(input.targetId, [...input.ancestorIds]);
  }
  return { selectedIds: [...kept, input.targetId], ancestryById: ancestry };
}

/** How many selected ids were picked from inside `archiveId`. */
export function countSelectedArchiveMembers(
  selectedIds: readonly string[],
  archiveId: string,
  ancestryById: ReadonlyMap<string, readonly string[]>,
): number {
  return selectedIds.filter((id) => (ancestryById.get(id) ?? []).includes(archiveId)).length;
}
