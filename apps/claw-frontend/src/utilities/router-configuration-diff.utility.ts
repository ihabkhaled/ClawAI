import { VersionDiffStatus } from '@/enums';
import type {
  ChainEntryInput,
  RouterChainEntryDiffItem,
  RouterConfigurationDetail,
  RouterConfigurationDiff,
} from '@/types/smart-router-admin.types';

import { toChainEntryInput } from './router-configuration-entry.utility';

const COMPARABLE_FIELDS: readonly (keyof ChainEntryInput)[] = [
  'role',
  'provider',
  'modelAlias',
  'deploymentId',
  'enabled',
  'attemptTimeoutMs',
  'retries',
  'triggers',
  'skipWhenProviderCircuitOpen',
  'minConfidence',
  'maxCostMicroUsd',
  'billingModel',
];

function fieldsDiffer(a: unknown, b: unknown): boolean {
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length !== b.length || a.some((value, index) => value !== b[index]);
  }
  return a !== b;
}

function changedFields(before: ChainEntryInput, after: ChainEntryInput): (keyof ChainEntryInput)[] {
  return COMPARABLE_FIELDS.filter((field) => fieldsDiffer(before[field], after[field]));
}

/** Compares two revisions' chain entries by array position (1-based `order`).
 * Entries have no stable identity across revisions — copy-on-write drafting
 * gives every revision its own entry rows — so position is the only
 * meaningful key for "what changed here". */
export function diffRouterConfigurations(
  from: RouterConfigurationDetail,
  to: RouterConfigurationDetail,
): RouterConfigurationDiff {
  const fromEntries = [...from.entries].sort((a, b) => a.order - b.order).map(toChainEntryInput);
  const toEntries = [...to.entries].sort((a, b) => a.order - b.order).map(toChainEntryInput);
  const maxLength = Math.max(fromEntries.length, toEntries.length);

  const entries: RouterChainEntryDiffItem[] = [];
  for (let index = 0; index < maxLength; index += 1) {
    const before = fromEntries[index] ?? null;
    const after = toEntries[index] ?? null;
    const order = index + 1;

    if (before === null && after !== null) {
      entries.push({
        order,
        status: VersionDiffStatus.ADDED,
        before: null,
        after,
        changedFields: [],
      });
    } else if (before !== null && after === null) {
      entries.push({
        order,
        status: VersionDiffStatus.REMOVED,
        before,
        after: null,
        changedFields: [],
      });
    } else if (before !== null && after !== null) {
      const fields = changedFields(before, after);
      entries.push({
        order,
        status: fields.length === 0 ? VersionDiffStatus.UNCHANGED : VersionDiffStatus.CHANGED,
        before,
        after,
        changedFields: fields,
      });
    }
  }

  return { fromRevision: from.revision, toRevision: to.revision, entries };
}
