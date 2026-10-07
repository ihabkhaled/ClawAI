import type { ReactElement } from 'react';

import { CreditDualConsumptionNotice } from '@/components/billing/credit-dual-consumption-notice';
import { ModelPicker } from '@/components/chat/model-picker';
import { useModelSelector } from '@/hooks/chat/use-model-selector';
import type { ThreadModelPickerProps } from '@/types/thread-publication.types';
import { encodeModelValue, decodeModelValue } from '@/utilities';
import { isThreadModelGroupKey } from '@/utilities/thread-model-defaults.utility';

/**
 * One Thread role's model, chosen in the same grouped, searchable, badged picker
 * the chat composer uses (providers, capabilities, pay-as-you-go cost). Threads is
 * a long cloud workload, so image and on-device groups are left out, and there is
 * no "Auto": every role names its model.
 */
export function ThreadModelPicker({
  id,
  label,
  value,
  onChange,
}: ThreadModelPickerProps): ReactElement {
  const { groups, groupedModels, isLoading, t } = useModelSelector();
  const threadGroups = groups.filter((group) => isThreadModelGroupKey(group.key));

  function handleChange(next: string | null): void {
    const decoded = next === null ? null : decodeModelValue(next);
    if (!decoded) {
      return;
    }
    const match = groupedModels
      .find((group) => group.provider === decoded.provider)
      ?.models.find((model) => model.model === decoded.model);
    if (match) {
      onChange(match);
    }
  }

  return (
    <div className="flex flex-col gap-1 text-sm">
      <label htmlFor={id}>{label}</label>
      <ModelPicker
        id={id}
        ariaLabel={label}
        groups={threadGroups}
        value={encodeModelValue(value.provider, value.model)}
        onChange={handleChange}
        isLoading={isLoading}
        placeholder={value.displayName}
        loadingPlaceholder={t('chat.modelSelector.loading')}
        emptyPlaceholder={t('chat.modelSelector.empty')}
        searchPlaceholder={t('chat.modelSelector.search')}
        noResultsLabel={t('chat.modelSelector.noResults')}
        triggerClassName="h-10 w-full text-sm"
        footer={<CreditDualConsumptionNotice t={t} className="border-0 bg-transparent px-0 py-0" />}
      />
    </div>
  );
}
