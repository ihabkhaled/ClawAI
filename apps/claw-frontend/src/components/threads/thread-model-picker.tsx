import type { ReactElement } from 'react';

import { CreditDualConsumptionNotice } from '@/components/billing/credit-dual-consumption-notice';
import { ModelPicker } from '@/components/chat/model-picker';
import { useThreadModelPicker } from '@/hooks/threads/use-thread-model-picker';
import type { ThreadModelPickerProps } from '@/types/thread-publication.types';
import { isThreadCreditModel } from '@/utilities/thread-model-defaults.utility';

/**
 * One Thread role's model, chosen in the same grouped, searchable, badged picker
 * the chat composer uses (providers, capabilities, pay-as-you-go cost). Threads is
 * a long cloud workload, so image and on-device groups are left out, and there is
 * no "Auto": every role names its model. A model this account cannot use is listed
 * with its reason and cannot be chosen.
 */
export function ThreadModelPicker({
  id,
  label,
  value,
  onChange,
  availability,
  planName,
}: ThreadModelPickerProps): ReactElement {
  const picker = useThreadModelPicker({ onChange, availability, planName });

  return (
    <div className="flex flex-col gap-1 text-sm">
      <label htmlFor={id}>{label}</label>
      <ModelPicker
        id={id}
        ariaLabel={label}
        groups={picker.groups}
        value={picker.encode(value)}
        onChange={picker.handleChange}
        isLoading={picker.isLoading}
        placeholder={value.displayName}
        loadingPlaceholder={picker.t('chat.modelSelector.loading')}
        emptyPlaceholder={picker.t('chat.modelSelector.empty')}
        searchPlaceholder={picker.t('chat.modelSelector.search')}
        noResultsLabel={picker.t('chat.modelSelector.noResults')}
        triggerClassName="h-10 w-full text-sm"
        footer={
          <CreditDualConsumptionNotice t={picker.t} className="border-0 bg-transparent px-0 py-0" />
        }
      />
      {isThreadCreditModel(value) ? (
        <p
          role="note"
          className="dark:text-warning text-xs text-amber-700"
          data-testid="thread-model-credit-warning"
        >
          {picker.t('chat.threadProgress.needsCredit')}
        </p>
      ) : null}
    </div>
  );
}
