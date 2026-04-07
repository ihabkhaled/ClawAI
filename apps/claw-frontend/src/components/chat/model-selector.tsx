import { Bot } from 'lucide-react';

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAvailableModels } from '@/hooks/chat/use-available-models';
import type { ModelSelectorProps } from '@/types';

const AUTO_VALUE = '__auto__';

function encodeModelValue(provider: string, model: string): string {
  return `${provider}::${model}`;
}

function decodeModelValue(value: string): { provider: string; model: string } | null {
  const parts = value.split('::');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return null;
  }
  return { provider: parts[0], model: parts[1] };
}

export function ModelSelector({ value, onChange, disabled }: ModelSelectorProps): React.ReactElement {
  const { groupedModels, isLoading } = useAvailableModels();

  const selectedValue = value ? encodeModelValue(value.provider, value.model) : AUTO_VALUE;

  const handleChange = (val: string): void => {
    if (val === AUTO_VALUE) {
      onChange(null);
      return;
    }
    const decoded = decodeModelValue(val);
    if (!decoded) {
      onChange(null);
      return;
    }
    const group = groupedModels.find((g) => g.provider === decoded.provider);
    const match = group?.models.find((m) => m.model === decoded.model);
    onChange(match ?? { provider: decoded.provider, model: decoded.model, displayName: decoded.model });
  };

  return (
    <Select value={selectedValue} onValueChange={handleChange} disabled={disabled || isLoading}>
      <SelectTrigger className="h-9 w-[200px] text-xs">
        <Bot className="mr-1 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <SelectValue placeholder={isLoading ? 'Loading models...' : 'Auto'} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={AUTO_VALUE}>Auto (routing decides)</SelectItem>
        {groupedModels.map((group) => (
          <SelectGroup key={group.provider}>
            <SelectLabel>{group.label}</SelectLabel>
            {group.models.map((model) => (
              <SelectItem
                key={encodeModelValue(model.provider, model.model)}
                value={encodeModelValue(model.provider, model.model)}
              >
                {model.displayName}
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}
