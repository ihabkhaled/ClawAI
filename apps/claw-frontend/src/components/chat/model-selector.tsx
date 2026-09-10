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
  // A narrow trigger is narrow, not empty.
  //
  // It used to render as a 36px square with the name only in a `sr-only` span,
  // so on a phone — the one place the header does not repeat it either — there
  // was nothing on screen saying which model would answer. The name is the most
  // important thing in this row, so it gets the room: a short label inside a
  // bounded width, with the toolbar scrolling sideways to fit the rest. The
  // full name stays on the tooltip, the aria-label and the sheet it opens.
  const isNarrow = isCompact && showLabel !== true;
  const triggerClass = isCompact
    ? cn(
        'border-border/60 h-9 shrink-0 gap-1 rounded-xl px-2 text-xs',
        isNarrow ? 'w-[7.5rem]' : 'w-[9rem]',
      )
    : 'h-9 w-[220px] text-xs sm:w-[260px]';

  return (
    <ModelPicker
      groups={groups}
      value={selectedValue}
      onChange={handleChange}
      disabled={disabled}
      isLoading={isLoading}
      autoOption={{
        value: MODEL_AUTO_VALUE,
        label: t('chat.modelSelector.autoLabel'),
        shortLabel: t('chat.modelSelector.autoShortLabel'),
      }}
      placeholder={t('chat.modelSelector.autoShortLabel')}
      loadingPlaceholder={t('chat.modelSelector.loading')}
      emptyPlaceholder={t('chat.modelSelector.empty')}
      searchPlaceholder={t('chat.modelSelector.search')}
      noResultsLabel={t('chat.modelSelector.noResults')}
      triggerClassName={triggerClass}
      useShortTriggerLabel={isNarrow}
      // The disclaimer belongs where the money decision is made. A cloud model
      // spends BOTH the dollar wallet and the daily token allowance; a local one
      // spends tokens only, and that is the single most useful thing to know
      // while choosing between them.
      footer={<CreditDualConsumptionNotice t={t} className="border-0 bg-transparent px-0 py-0" />}
    />
  );
}
