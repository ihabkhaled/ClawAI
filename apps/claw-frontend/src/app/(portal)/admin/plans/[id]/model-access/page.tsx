'use client';

import type { ReactElement } from 'react';

import { AccessDenied } from '@/components/admin/access-denied';
import { ModelAccessEditor } from '@/components/admin/plans/model-access-editor';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { UserRole } from '@/enums';
import { useModelAccessPage } from '@/hooks/plans/use-model-access-page';

export default function PlanModelAccessPage(): ReactElement {
  const {
    t,
    user,
    plan,
    rows,
    isLoading,
    isError,
    error,
    isSaving,
    saveError,
    addRow,
    removeRow,
    updateRow,
    onSave,
    onCancel,
    onRetry,
  } = useModelAccessPage();

  if (user && user.role !== UserRole.ADMIN) {
    return <AccessDenied t={t} />;
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title={t('adminPlans.modelAccess.title')}
        description={plan?.name ?? t('adminPlans.modelAccess.description')}
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
        <ModelAccessEditor
          rows={rows}
          addRow={addRow}
          removeRow={removeRow}
          updateRow={updateRow}
          onSave={onSave}
          onCancel={onCancel}
          isSaving={isSaving}
          saveErrorMessage={saveError?.message ?? null}
          t={t}
        />
      ) : null}
    </div>
  );
}
