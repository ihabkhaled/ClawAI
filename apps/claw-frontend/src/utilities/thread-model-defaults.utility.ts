import { THREAD_PREFERRED_PROVIDERS } from '@/constants/thread-publication.constants';
import type { ModelSelection } from '@/types';

function isSameModel(a: ModelSelection, b: ModelSelection): boolean {
  return a.provider === b.provider && a.model === b.model;
}

/**
 * Default model per Thread role. Established providers come first, one model
 * from each, so the authors, Judge and Critic do not all share one provider;
 * the rest of the list fills any remaining roles. When fewer distinct models
 * exist than roles, the list repeats from the start rather than leaving a role
 * empty.
 */
export function pickDistinctModels(available: ModelSelection[], count: number): ModelSelection[] {
  const distinct = available.filter(
    (entry, index) => available.findIndex((other) => isSameModel(other, entry)) === index,
  );
  const firstPerPreferredProvider = THREAD_PREFERRED_PROVIDERS.flatMap((provider) => {
    const first = distinct.find((entry) => entry.provider === provider);
    return first ? [first] : [];
  });
  const ordered = [
    ...firstPerPreferredProvider,
    ...distinct.filter((entry) => !firstPerPreferredProvider.some((p) => isSameModel(p, entry))),
  ];
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
