import type { ChainEntryInput, RouterChainEntry } from '@/types/smart-router-admin.types';

/** Strips the persisted, server-owned fields (id, order, timestamps,
 * lastValidatedAt) and converts the serialized `maxCostMicroUsd` decimal
 * string back to a number — the PATCH endpoint takes the full desired chain
 * every time, keyed by array position, never by entry id. */
export function toChainEntryInput(entry: RouterChainEntry): ChainEntryInput {
  return {
    role: entry.role,
    provider: entry.provider,
    modelAlias: entry.modelAlias,
    deploymentId: entry.deploymentId ?? undefined,
    enabled: entry.enabled,
    attemptTimeoutMs: entry.attemptTimeoutMs,
    retries: entry.retries,
    triggers: entry.triggers,
    skipWhenProviderCircuitOpen: entry.skipWhenProviderCircuitOpen,
    minConfidence: entry.minConfidence ?? undefined,
    maxCostMicroUsd: entry.maxCostMicroUsd === null ? undefined : Number(entry.maxCostMicroUsd),
    billingModel: entry.billingModel,
  };
}

/** Moves `movedEntryId` to the array position currently held by the entry
 * whose `order` equals `targetOrder`, then serializes the full chain in its
 * new order — order is 1-based and derived purely from array position. */
export function buildReorderedEntries(
  entries: readonly RouterChainEntry[],
  movedEntryId: string,
  targetOrder: number,
): ChainEntryInput[] {
  const sorted = [...entries].sort((a, b) => a.order - b.order);
  const sourceIndex = sorted.findIndex((entry) => entry.id === movedEntryId);
  const targetIndex = sorted.findIndex((entry) => entry.order === targetOrder);
  if (sourceIndex === -1 || targetIndex === -1 || sourceIndex === targetIndex) {
    return sorted.map(toChainEntryInput);
  }

  const reordered = [...sorted];
  const [moved] = reordered.splice(sourceIndex, 1);
  if (moved === undefined) {
    return sorted.map(toChainEntryInput);
  }
  reordered.splice(targetIndex, 0, moved);
  return reordered.map(toChainEntryInput);
}

/** Serializes the chain with `removedEntryId` omitted. */
export function buildEntriesWithoutEntry(
  entries: readonly RouterChainEntry[],
  removedEntryId: string,
): ChainEntryInput[] {
  return [...entries]
    .sort((a, b) => a.order - b.order)
    .filter((entry) => entry.id !== removedEntryId)
    .map(toChainEntryInput);
}

/** Serializes the chain with `newEntry` appended at the end. */
export function buildEntriesWithAppendedEntry(
  entries: readonly RouterChainEntry[],
  newEntry: ChainEntryInput,
): ChainEntryInput[] {
  const current = [...entries].sort((a, b) => a.order - b.order).map(toChainEntryInput);
  return [...current, newEntry];
}
