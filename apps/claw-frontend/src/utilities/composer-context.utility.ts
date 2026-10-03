import type { ComposerPackGroup } from '@/types/composer-context.types';
import type { ContextPack } from '@/types/context-pack.types';
import type { RetrievalPackEntry } from '@/types/context-receipt.types';

/**
 * Groups the items a preview says would be sent by the pack they belong to,
 * in the order the packs first appear, naming each from the user's pack list.
 * A pack that is not in the list (deleted, or still loading) keeps its id as
 * its name rather than being dropped — an item that would be sent must show.
 */
export function groupPackItems(
  items: readonly RetrievalPackEntry[],
  packs: readonly ContextPack[],
): ComposerPackGroup[] {
  const groups = new Map<string, ComposerPackGroup>();
  for (const item of items) {
    const existing = groups.get(item.contextPackId);
    if (existing === undefined) {
      const name = packs.find((pack) => pack.id === item.contextPackId)?.name;
      groups.set(item.contextPackId, {
        packId: item.contextPackId,
        name: name ?? item.contextPackId,
        items: [item],
      });
    } else {
      existing.items.push(item);
    }
  }
  return [...groups.values()];
}

/** The next selection after one pack is toggled; null when it would pass `max`. */
export function toggledPackIds(
  current: readonly string[],
  packId: string,
  max: number,
): string[] | null {
  if (current.includes(packId)) {
    return current.filter((id) => id !== packId);
  }
  return current.length >= max ? null : [...current, packId];
}
