import { ModelPicker } from '@/components/chat/model-picker';
import { MODEL_AUTO_VALUE } from '@/constants';
import { ComposerControlVariant } from '@/enums';
import { useAvailableModels } from '@/hooks/chat/use-available-models';
import { cn } from '@/lib/utils';
import type { ModelSelectorProps } from '@/types';
import { decodeModelValue, encodeModelValue, groupedModelsToPickerGroups } from '@/utilities';

export function ModelSelector({
  value,
  onChange,
  disabled,
  variant = ComposerControlVariant.Default,
  showLabel,
}: ModelSelectorProps): React.ReactElement {
  const { groupedModels, isLoading } = useAvailableModels();

  // Both selector callsites (MessageComposer + ThreadSettings) MUST share the
  // exact same enabling logic. The picker is disabled ONLY for runtime reasons:
  //   1. the caller passed `disabled` (e.g. an inflight send/save) — transient
  //   2. the available-models query is still loading
  //   3. the query has settled with zero options to choose
  // It is NEVER disabled by plan-feature flags (compare/judge/critic/
  // research) — those gate workflows, not model selection. Model SELECTION is
  // always open to every plan tier; admin-only PlanModelAccess restrictions (if
  // any rows exist) are enforced server-side at execution time, not in the UI.
  const groups = groupedModelsToPickerGroups(groupedModels);
  const selectedValue = value ? encodeModelValue(value.provider, value.model) : MODEL_AUTO_VALUE;

  const handleChange = (val: string | null): void => {
    if (val === null || val === MODEL_AUTO_VALUE) {
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

  // Compact variant — icon-only square button, optional inline label.
  // Default variant — keeps the historical full-width trigger.
  const isCompact = variant === ComposerControlVariant.Compact;
  const triggerClass = isCompact
    ? cn(
        'h-8 gap-1 rounded-xl border-border/60 px-2 text-xs',
        showLabel ? 'min-w-[7rem]' : 'w-8 justify-center px-0',
      )
    : 'h-9 w-[220px] text-xs sm:w-[260px]';

  return (
    <ModelPicker
      groups={groups}
      value={selectedValue}
      onChange={handleChange}
      disabled={disabled}
      isLoading={isLoading}
      autoOption={{ value: MODEL_AUTO_VALUE, label: 'Auto (routing decides)' }}
      placeholder="Auto"
      loadingPlaceholder="Loading models..."
      emptyPlaceholder="No models available"
      searchPlaceholder="Search"
      noResultsLabel="No results found"
      triggerClassName={triggerClass}
      ariaLabel={isCompact && !showLabel ? 'Auto' : undefined}
    />
  );
}
