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
import { MODEL_AUTO_VALUE } from '@/constants';
import { useAvailableModels } from '@/hooks/chat/use-available-models';
import type { AdvancedModuleModelSelectorProps } from '@/types';
import { decodeModelValue, encodeModelValue } from '@/utilities';

export function AdvancedModuleModelSelector({
  t,
  value,
  onChange,
  disabled,
}: AdvancedModuleModelSelectorProps): React.ReactElement {
  const { groupedModels, isLoading } = useAvailableModels();
  const localGroup = groupedModels.find((group) => group.provider === 'local-ollama') ?? null;
  const models = localGroup?.models ?? [];
  const selectedValue = value ? encodeModelValue(value.provider, value.model) : MODEL_AUTO_VALUE;
  const isDisabled = disabled || isLoading || models.length === 0;

  const handleChange = (nextValue: string): void => {
    if (nextValue === MODEL_AUTO_VALUE) {
      onChange(null);
      return;
    }

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

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium" htmlFor="advanced-module-model-selector">
        {t('advancedModelSelector.label')}
      </label>
      <Select value={selectedValue} onValueChange={handleChange} disabled={isDisabled}>
        <SelectTrigger id="advanced-module-model-selector" className="w-full">
          <Bot className="text-muted-foreground me-2 h-4 w-4 shrink-0" />
          <SelectValue
            placeholder={
              isLoading ? t('advancedModelSelector.loading') : t('advancedModelSelector.auto')
            }
          />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={MODEL_AUTO_VALUE}>{t('advancedModelSelector.auto')}</SelectItem>
          {localGroup ? (
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
      <p className="text-muted-foreground text-xs">
        {models.length > 0
          ? t('advancedModelSelector.description')
          : t('advancedModelSelector.empty')}
      </p>
    </div>
  );
}
