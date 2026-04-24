import { AUTO_GROUP_PROVIDER, AUTO_MODEL } from '@/constants/ai-actions.constants';
import type { ModelChoice } from '@/types/ai-action.types';
import type { GroupedModels } from '@/types/component.types';

export function buildSelectionKey(provider: string, model: string): string {
  return `${provider}::${model}`;
}

export function resolvePreferredModel(
  selectedKey: string,
  groupedModels: GroupedModels[],
): ModelChoice | undefined {
  if (selectedKey === buildSelectionKey(AUTO_GROUP_PROVIDER, AUTO_MODEL.model)) {
    return undefined;
  }
  const [provider, model] = selectedKey.split('::');
  const group = groupedModels.find((g) => g.provider === provider);
  const entry = group?.models.find((m) => m.model === model);
  if (entry === undefined) {
    return undefined;
  }
  return {
    provider: entry.provider,
    model: entry.model,
    displayName: entry.displayName,
  };
}
