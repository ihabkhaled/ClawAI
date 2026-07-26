import { Bot } from 'lucide-react';

import { SelectGroupHeader } from '@/components/common/select-group-header';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAvailableModels } from '@/hooks/chat/use-available-models';
import type { OrchestrationSingleModelSelectProps } from '@/types/orchestration.types';
import { decodeModelValue, encodeModelValue } from '@/utilities';

// Strict single-model picker for orchestration lab pages.
//
// Unlike the `ModelSelector` used in the chat composer, this dropdown
// deliberately OMITS the "Auto" entry — every orchestration lab page
// must run against a specific local model the user has explicitly
// selected. The host page is expected to disable its submit button
// until `value !== null`.
//
// The picker reuses the same `useAvailableModels()` hook the main
// composer uses, but filters to the `local-ollama` group only. Local
// llama.cpp Frontier models and cloud connectors are intentionally
// excluded — orchestration labs run on the local routing fleet.
//
// All user-visible copy is sourced from `t()` so the 9 i18n locales
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
  const localGroup = groupedModels.find((group) => group.provider === 'local-ollama') ?? null;
  const models = localGroup?.models ?? [];
  const isEmpty = !isLoading && models.length === 0;
  const isDisabled = disabled === true || isLoading || isEmpty;

  const resolvedLabel = label ?? t('advancedModelSelector.label');
  const resolvedPlaceholder = placeholderLabel ?? t('advancedModelSelector.label');
  const resolvedLoading = loadingLabel ?? t('advancedModelSelector.loading');
  const resolvedEmpty = emptyLabel ?? t('advancedModelSelector.empty');
  const resolvedHelper = helperLabel ?? t('advancedModelSelector.description');

  const selectedValue = value === null ? '' : encodeModelValue(value.provider, value.model);

  const handleChange = (nextValue: string): void => {
    const decoded = decodeModelValue(nextValue);
    if (!decoded) {
      onChange(null);
      return;
    }
    const match = models.find(
      (model) => model.provider === decoded.provider && model.model === decoded.model,
    );
    onChange(match ?? null);
  };

  let triggerPlaceholder: string;
  if (isLoading) {
    triggerPlaceholder = resolvedLoading;
  } else if (isEmpty) {
    triggerPlaceholder = resolvedEmpty;
  } else {
    triggerPlaceholder = resolvedPlaceholder;
  }

  return (
    <div className="space-y-2">
      <label
        className="text-foreground block text-sm font-medium"
        htmlFor="orchestration-single-model-select"
      >
        {resolvedLabel}
      </label>
      <Select
        value={selectedValue === '' ? undefined : selectedValue}
        onValueChange={handleChange}
        disabled={isDisabled}
      >
        <SelectTrigger id="orchestration-single-model-select" className="w-full">
          <Bot className="text-muted-foreground me-2 h-4 w-4 shrink-0" />
          <SelectValue placeholder={triggerPlaceholder} />
        </SelectTrigger>
        <SelectContent>
          {localGroup !== null ? (
            <SelectGroup>
              <SelectGroupHeader>{localGroup.label}</SelectGroupHeader>
              {models.map((model) => (
                <SelectItem
                  key={encodeModelValue(model.provider, model.model)}
                  value={encodeModelValue(model.provider, model.model)}
                  textValue={model.displayName}
                >
                  {model.displayName}
                </SelectItem>
              ))}
            </SelectGroup>
          ) : null}
        </SelectContent>
      </Select>
      <p className="text-muted-foreground text-xs">{isEmpty ? resolvedEmpty : resolvedHelper}</p>
    </div>
  );
}
