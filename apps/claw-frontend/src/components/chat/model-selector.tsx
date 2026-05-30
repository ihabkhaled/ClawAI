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
import { MODEL_AUTO_VALUE } from '@/constants';
import { useAvailableModels } from '@/hooks/chat/use-available-models';
import type { ModelSelectorProps } from '@/types';
import { decodeModelValue, encodeModelValue } from '@/utilities';

export function ModelSelector({
  value,
  onChange,
  disabled,
}: ModelSelectorProps): React.ReactElement {
  const { groupedModels, isLoading } = useAvailableModels();

  // Both selector callsites (MessageComposer + ThreadSettings) MUST share the
  // exact same enabling logic. The Select is disabled ONLY for runtime reasons:
  //   1. the caller passed `disabled` (e.g. an inflight send/save) — transient
  //   2. the available-models query is still loading
  //   3. the query has settled with zero options to choose
  // The Select is NEVER disabled by plan-feature flags (compare/judge/critic/
  // research) — those gate workflows, not model selection. Model SELECTION is
  // always open to every plan tier; admin-only PlanModelAccess restrictions (if
  // any rows exist) are enforced server-side at execution time, not in the UI.
  const totalModelCount = groupedModels.reduce((sum, g) => sum + g.models.length, 0);
  const hasNoModels = !isLoading && totalModelCount === 0;

  const selectedValue = value ? encodeModelValue(value.provider, value.model) : MODEL_AUTO_VALUE;

  const handleChange = (val: string): void => {
    if (val === MODEL_AUTO_VALUE) {
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
    onChange(
      match ?? { provider: decoded.provider, model: decoded.model, displayName: decoded.model },
    );
  };

  const resolvePlaceholder = (): string => {
    if (isLoading) {
      return 'Loading models...';
    }
    if (hasNoModels) {
      return 'No models available';
    }
    return 'Auto';
  };
  const placeholder = resolvePlaceholder();

  return (
    <Select
      value={selectedValue}
      onValueChange={handleChange}
      disabled={disabled || isLoading || hasNoModels}
    >
      <SelectTrigger className="h-9 w-[220px] text-xs sm:w-[260px]">
        <Bot className="mr-1 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="w-[min(420px,calc(100vw-2rem))]">
        <SelectItem value={MODEL_AUTO_VALUE}>Auto (routing decides)</SelectItem>
        {groupedModels.map((group) => (
          <SelectGroup key={group.provider}>
            <SelectLabel>{group.label}</SelectLabel>
            {group.models.map((model) => (
              <SelectItem
                key={encodeModelValue(model.provider, model.model)}
                value={encodeModelValue(model.provider, model.model)}
                textValue={model.displayName}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className="min-w-0 flex-1 truncate">{model.displayName}</span>
                  {model.specifications !== undefined && model.specifications.length > 0 ? (
                    <span className="flex shrink-0 flex-wrap justify-end gap-1">
                      {model.specifications.map((specification) => (
                        <span
                          key={specification}
                          className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] leading-none text-muted-foreground"
                        >
                          {specification}
                        </span>
                      ))}
                    </span>
                  ) : null}
                </span>
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}
