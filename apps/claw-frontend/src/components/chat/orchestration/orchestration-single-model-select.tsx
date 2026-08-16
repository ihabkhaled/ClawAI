import { ModelPicker } from '@/components/chat/model-picker';
import { useAvailableModels } from '@/hooks/chat/use-available-models';
import type { OrchestrationSingleModelSelectProps } from '@/types/orchestration.types';
import { decodeModelValue, encodeModelValue, groupedModelsToPickerGroups } from '@/utilities';

// Strict single-model picker for orchestration lab pages.
//
// Unlike the `ModelSelector` used in the chat composer, this dropdown
// deliberately OMITS the "Auto" entry — every orchestration lab page
// must run against a specific model the user has explicitly selected.
// The host page is expected to disable its submit button until
// `value !== null`.
//
// Shows every provider group from useAvailableModels() (local Ollama,
// local llama.cpp Frontier, and every connected cloud provider) — same
// as the main composer/compare pickers. It used to be hardcoded to the
// `local-ollama` group only, which meant every lab page showed "no
// models available" whenever Ollama had nothing installed even though
// cloud or Frontier models were available; that restriction served no
// product purpose (labs execute through the same routing/orchestration
// pipeline as any other run) and is fixed here.
//
// All user-visible copy is sourced from `t()` so the 13 i18n locales
// can localise the label / placeholder / empty text. The default keys
// live under `advancedModelSelector.*` (same namespace the existing
// module selector uses) so adopters do not need to duplicate strings.
export function OrchestrationSingleModelSelect({
  value,
  onChange,
  disabled,
  label,
  placeholderLabel,
  loadingLabel,
  emptyLabel,
  helperLabel,
  t,
}: OrchestrationSingleModelSelectProps): React.ReactElement {
  const { groupedModels, isLoading } = useAvailableModels();
  const groups = groupedModelsToPickerGroups(groupedModels);
  const totalModelCount = groupedModels.reduce((sum, group) => sum + group.models.length, 0);
  const isEmpty = !isLoading && totalModelCount === 0;

  const resolvedLabel = label ?? t('advancedModelSelector.label');
  const resolvedPlaceholder = placeholderLabel ?? t('advancedModelSelector.label');
  const resolvedLoading = loadingLabel ?? t('advancedModelSelector.loading');
  const resolvedEmpty = emptyLabel ?? t('advancedModelSelector.empty');
  const resolvedHelper = helperLabel ?? t('advancedModelSelector.description');

  const selectedValue = value === null ? null : encodeModelValue(value.provider, value.model);

  const handleChange = (nextValue: string | null): void => {
    const decoded = nextValue === null ? null : decodeModelValue(nextValue);
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
      <label
        className="text-foreground block text-sm font-medium"
        htmlFor="orchestration-single-model-select"
      >
        {resolvedLabel}
      </label>
      <ModelPicker
        id="orchestration-single-model-select"
        groups={groups}
        value={selectedValue}
        onChange={handleChange}
        disabled={disabled}
        isLoading={isLoading}
        placeholder={resolvedPlaceholder}
        loadingPlaceholder={resolvedLoading}
        emptyPlaceholder={resolvedEmpty}
        searchPlaceholder={t('common.search')}
        noResultsLabel={t('common.noResults')}
      />
      <p className="text-muted-foreground text-xs">{isEmpty ? resolvedEmpty : resolvedHelper}</p>
    </div>
  );
}
