import { CreditDualConsumptionNotice } from '@/components/billing/credit-dual-consumption-notice';
import { ModelPicker } from '@/components/chat/model-picker';
import { MODEL_AUTO_VALUE } from '@/constants';
import { ComposerControlVariant } from '@/enums';
import { useModelSelector } from '@/hooks/chat/use-model-selector';
import { cn } from '@/lib/utils';
import type { ModelSelectorProps } from '@/types';
import { decodeModelValue, encodeModelValue } from '@/utilities';

export function ModelSelector({
  value,
  onChange,
  disabled,
  variant = ComposerControlVariant.Default,
  showLabel,
}: ModelSelectorProps): React.ReactElement {
  const { groups, groupedModels, isLoading, t } = useModelSelector();

  // Both selector callsites (MessageComposer + ThreadSettings) MUST share the
  // exact same enabling logic. The picker is disabled ONLY for runtime reasons:
  //   1. the caller passed `disabled` (e.g. an inflight send/save) — transient
  //   2. the available-models query is still loading
  //   3. the query has settled with zero options to choose
  // It is NEVER disabled by plan-feature flags (compare/judge/critic/
  // research) — those gate workflows, not model selection. Model SELECTION is
  // always open to every plan tier; admin-only PlanModelAccess restrictions (if
  // any rows exist) are enforced server-side at execution time, not in the UI.
  //
  // Pay-as-you-go credit does NOT change that. A metered model carries a cost
  // BADGE and stays selectable: whether a provider is billable is a runtime
  // connector policy an administrator can flip, and the reservation call is the
  // only place that can answer it correctly. Greying a model out here would
  // hide models the account can actually afford.
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
  // Icon-only is a square that stays square. It used to keep the label mounted
  // and merely narrow the button, so the name wrapped one syllable per line and
  // spilled out; the name now lives in the dialog the button opens.
  const isIconOnly = isCompact && showLabel !== true;
  const triggerClass = isCompact
    ? cn(
        'border-border/60 h-9 gap-1 rounded-xl px-2 text-xs',
        isIconOnly ? 'w-9 shrink-0 justify-center px-0' : 'min-w-0 max-w-[9rem] flex-1',
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
      hideTriggerLabel={isIconOnly}
      ariaLabel={isIconOnly ? 'Auto' : undefined}
      // The disclaimer belongs where the money decision is made. A cloud model
      // spends BOTH the dollar wallet and the daily token allowance; a local one
      // spends tokens only, and that is the single most useful thing to know
      // while choosing between them.
      footer={<CreditDualConsumptionNotice t={t} className="border-0 bg-transparent px-0 py-0" />}
    />
  );
}
