import type { ModelPickerGroup } from '@/types/component.types';
import type { ModelAccessRequestEntry } from '@/types/model-access.types';

// A short, stable fingerprint of the catalogue, so the plan-access answer is cached per catalogue
// without putting tens of kilobytes of model ids into a query key. FNV-1a over the sorted keys.
export function hashModelCatalogue(models: readonly ModelAccessRequestEntry[]): string {
  const keys = models.map((model) => `${model.provider}/${model.model}`).toSorted();
  let hash = 0x811c9dc5;
  for (const key of keys) {
    for (let index = 0; index < key.length; index += 1) {
      hash = Math.imul(hash ^ key.charCodeAt(index), 0x01000193) >>> 0;
    }
    hash = Math.imul(hash ^ 0x2f, 0x01000193) >>> 0;
  }
  return `${String(keys.length)}-${hash.toString(16)}`;
}

// True when the option with this value is on the user's plan's blocked list.
export function isLockedOption(groups: readonly ModelPickerGroup[], value: string): boolean {
  return groups.some((group) =>
    group.options.some((option) => option.value === value && option.isLocked === true),
  );
}
