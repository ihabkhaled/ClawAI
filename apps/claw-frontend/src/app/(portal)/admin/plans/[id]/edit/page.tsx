'use client';

import type { ReactElement } from 'react';

import { AccessDenied } from '@/components/admin/access-denied';
import { PlanForm } from '@/components/admin/plans/plan-form';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { UserRole } from '@/enums';
import { usePlanFormPage } from '@/hooks/plans/use-plan-form-page';

export default function EditPlanPage(): ReactElement {
  const {
    t,
    user,
    plan,
    form,
    isLoading,
    isError,
    error,
    isSubmitting,
    submitError,
    onSubmit,
    onCancel,
    onRetry,
  } = usePlanFormPage();

  if (user && user.role !== UserRole.ADMIN) {
    return <AccessDenied t={t} />;
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title={t('adminPlans.edit.title')}
        description={plan?.name ?? t('adminPlans.edit.description')}
      />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">{t('adminPlans.loading')}</p>
      ) : null}

      {isError ? (
        <div
          className="flex items-center justify-between gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
          role="alert"
        >
          <span>{error?.message ?? t('adminPlans.error')}</span>
          <Button type="button" size="sm" variant="outline" onClick={onRetry}>
            {t('common.retry')}
          </Button>
        </div>
      ) : null}

      {!isLoading && !isError ? (
        <PlanForm
          state={form.state}
          fieldErrors={form.fieldErrors}
          setField={form.setField}
          onSubmit={onSubmit}
          onCancel={onCancel}
          isSubmitting={isSubmitting}
          isEdit
          submitErrorMessage={submitError?.message ?? null}
          t={t}
        />
      ) : null}
    </div>
  );
}
