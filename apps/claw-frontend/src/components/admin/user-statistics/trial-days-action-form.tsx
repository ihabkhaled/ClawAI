'use client';

import type { ReactElement } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { PLAN_TRIAL_MAX_DAYS, PLAN_TRIAL_MIN_DAYS } from '@/constants/plan.constants';
import type { TrialDaysActionFormViewProps } from '@/types/admin-user-statistics.types';

/** One reasoned-days form: how many days, why, and the first thing wrong with it. */
export function TrialDaysActionFormView({
  idPrefix,
  form,
  daysLabel,
  help,
  confirmLabel,
  t,
}: TrialDaysActionFormViewProps): ReactElement {
  return (
    <form
      className="border-border space-y-2 rounded-lg border p-3"
      onSubmit={(event) => {
        event.preventDefault();
        form.submit();
      }}
    >
      <div className="space-y-1">
        <label htmlFor={`${idPrefix}-days`} className="text-sm font-medium">
          {daysLabel}
        </label>
        <Input
          id={`${idPrefix}-days`}
          type="number"
          inputMode="numeric"
          min={PLAN_TRIAL_MIN_DAYS}
          max={PLAN_TRIAL_MAX_DAYS}
          step={1}
          autoComplete="off"
          value={form.days}
          onChange={(event) => form.setDays(event.target.value)}
        />
        <p className="text-muted-foreground text-xs">{help}</p>
      </div>
      <div className="space-y-1">
        <label htmlFor={`${idPrefix}-reason`} className="text-sm font-medium">
          {t('admin.assignPlanReasonLabel')}
        </label>
        <Textarea
          id={`${idPrefix}-reason`}
          maxLength={500}
          value={form.reason}
          onChange={(event) => form.setReason(event.target.value)}
        />
      </div>
      {form.errorKey === null ? null : (
        <p className="text-destructive text-xs" role="alert">
          {t(form.errorKey)}
        </p>
      )}
      <Button type="submit" size="sm" disabled={form.isPending}>
        {confirmLabel}
      </Button>
    </form>
  );
}
