import {
  THREAD_DEPRIORITIZED_PROVIDERS,
  THREAD_PREFERRED_PROVIDERS,
} from '@/constants/thread-publication.constants';
import type { ModelSelection } from '@/types';
import { isPaygBadgedProvider } from '@/utilities/credit.utility';

/** True when this model spends the owner's credit instead of the plan allowance. */
export function isThreadCreditModel(model: Pick<ModelSelection, 'provider'>): boolean {
  return isPaygBadgedProvider(model.provider);
}

function isSameModel(a: ModelSelection, b: ModelSelection): boolean {
  return a.provider === b.provider && a.model === b.model;
}

/**
 * Default model per Thread role. Established providers come first, one model
 * from each, so the authors, Judge and Critic do not all share one provider;
 * the rest of the list fills any remaining roles. When fewer distinct models
 * exist than roles, the list repeats from the start rather than leaving a role
 * empty.
 *
 * Models the plan includes win over credit models: a credit model fails the whole
 * job the moment the wallet is empty, so credit models are defaults only when
 * nothing else is available.
 */
export function rankThreadModels(available: ModelSelection[]): ModelSelection[] {
  const unique = available.filter(
    (entry, index) => available.findIndex((other) => isSameModel(other, entry)) === index,
  );
  const included = unique.filter((entry) => !isThreadCreditModel(entry));
  const pool = included.length > 0 ? included : unique;
  const reliable = pool.filter((entry) => !THREAD_DEPRIORITIZED_PROVIDERS.includes(entry.provider));
  const distinct = reliable.length > 0 ? reliable : pool;
  const firstPerPreferredProvider = THREAD_PREFERRED_PROVIDERS.flatMap((provider) => {
    const first = distinct.find((entry) => entry.provider === provider);
    return first ? [first] : [];
  });
  const ordered = [
    ...firstPerPreferredProvider,
    ...distinct.filter((entry) => !firstPerPreferredProvider.some((p) => isSameModel(p, entry))),
  ];
  return ordered;
}

export function pickDistinctModels(available: ModelSelection[], count: number): ModelSelection[] {
  const ordered = rankThreadModels(available);
  if (ordered.length === 0) {
    return [];
  }
  return Array.from({ length: count }, (_, index) => ordered[index % ordered.length]).filter(
    (entry): entry is ModelSelection => entry !== undefined,
  );
}

/**
 * Threads is a long, capped, cloud workload: image models and on-device runtimes
 * cannot serve it, so their provider groups are never offered.
 */
export function isThreadModelGroupKey(providerKey: string): boolean {
  return !providerKey.startsWith('IMAGE_') && !providerKey.startsWith('local-');
}
