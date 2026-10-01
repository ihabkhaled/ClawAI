'use client';

import type { ReactElement } from 'react';

import { TrialDaysActionFormView } from '@/components/admin/user-statistics/trial-days-action-form';
import { useUserTrialActions } from '@/hooks/admin/use-user-trial-actions';
import type { UserSubscriptionTrialActionsProps } from '@/types/admin-user-statistics.types';

/**
 * The two admin levers on a free trial: add days to it, or set the user to the
 * Free plan for a number of days. Both need a reason and both are audit-logged by
 * the server; this component only collects them.
 */
export function UserSubscriptionTrialActions({
  userId,
  t,
}: UserSubscriptionTrialActionsProps): ReactElement {
  const { freePlanName, addDays, setFree } = useUserTrialActions(userId);

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      <TrialDaysActionFormView
        idPrefix="trial-add"
        form={addDays}
        daysLabel={t('admin.addTrialDaysLabel')}
        help={t('admin.addTrialDaysHelp')}
        confirmLabel={t('admin.addTrialDaysConfirm')}
        t={t}
      />
      {freePlanName === null ? null : (
        <TrialDaysActionFormView
          idPrefix="trial-set-free"
          form={setFree}
          daysLabel={t('admin.setFreeLabel', { plan: freePlanName })}
          help={t('admin.setFreeHelp')}
          confirmLabel={t('admin.setFreeConfirm', { plan: freePlanName })}
          t={t}
        />
      )}
    </div>
  );
}
