'use client';

import type { ReactElement } from 'react';

import { AccessDenied } from '@/components/admin/access-denied';
import { PlanForm } from '@/components/admin/plans/plan-form';
import { PageHeader } from '@/components/common/page-header';
import { UserRole } from '@/enums';
import { usePlanFormPage } from '@/hooks/plans/use-plan-form-page';

export default function NewPlanPage(): ReactElement {
  const { t, user, form, paygCreditPreview, isSubmitting, submitError, onSubmit, onCancel } =
    usePlanFormPage();

  if (user && user.role !== UserRole.ADMIN) {
    return <AccessDenied t={t} />;
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title={t('adminPlans.create.title')}
        description={t('adminPlans.create.description')}
      />
      <PlanForm
        state={form.state}
        fieldErrors={form.fieldErrors}
        setField={form.setField}
        paygCreditPreview={paygCreditPreview}
        onSubmit={onSubmit}
        onCancel={onCancel}
        isSubmitting={isSubmitting}
        isEdit={false}
        submitErrorMessage={submitError?.message ?? null}
        t={t}
      />
    </div>
  );
}
