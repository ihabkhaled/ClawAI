import { ModelPicker } from '@/components/chat/model-picker';
import { MODEL_AUTO_VALUE } from '@/constants';
import { useAvailableModels } from '@/hooks/chat/use-available-models';
import type { AdvancedModuleModelSelectorProps } from '@/types';
import { decodeModelValue, encodeModelValue, groupedModelsToPickerGroups } from '@/utilities';

// Was hardcoded to the `local-ollama` group only — see the identical fix and
// rationale in orchestration-single-model-select.tsx. Now shows every
// provider group, same as the main composer/compare pickers.
export function AdvancedModuleModelSelector({
  t,
  value,
  onChange,
  disabled,
}: AdvancedModuleModelSelectorProps): React.ReactElement {
  const { groupedModels, isLoading } = useAvailableModels();
  const groups = groupedModelsToPickerGroups(groupedModels);
  const totalModelCount = groupedModels.reduce((sum, group) => sum + group.models.length, 0);
  const selectedValue = value ? encodeModelValue(value.provider, value.model) : MODEL_AUTO_VALUE;

  const handleChange = (nextValue: string | null): void => {
    if (nextValue === null || nextValue === MODEL_AUTO_VALUE) {
      onChange(null);
      return;
    }

    const decoded = decodeModelValue(nextValue);
    if (!decoded) {
      onChange(null);
      return;
    }

    const group = groupedModels.find((g) => g.provider === decoded.provider);
    const match = group?.models.find((model) => model.model === decoded.model);
    onChange(match ?? null);
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium" htmlFor="advanced-module-model-selector">
        {t('advancedModelSelector.label')}
      </label>
      <ModelPicker
        id="advanced-module-model-selector"
        groups={groups}
        value={selectedValue}
        onChange={handleChange}
        disabled={disabled}
        isLoading={isLoading}
        autoOption={{ value: MODEL_AUTO_VALUE, label: t('advancedModelSelector.auto') }}
        placeholder={t('advancedModelSelector.auto')}
        loadingPlaceholder={t('advancedModelSelector.loading')}
        emptyPlaceholder={t('advancedModelSelector.empty')}
        searchPlaceholder={t('common.search')}
        noResultsLabel={t('common.noResults')}
      />
      <p className="text-muted-foreground text-xs">
        {totalModelCount > 0
          ? t('advancedModelSelector.description')
          : t('advancedModelSelector.empty')}
      </p>
    </div>
  );
}
