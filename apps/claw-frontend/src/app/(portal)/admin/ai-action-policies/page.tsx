'use client';

import { Plus } from 'lucide-react';
import type { ReactElement } from 'react';

import { AiActionPolicyRow } from '@/components/admin/ai-action-policy-row';
import { PolicyFormDialog } from '@/components/admin/policy-form-dialog';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { AdminFormMode } from '@/enums/admin-form-mode.enum';
import { useAiActionPoliciesPage } from '@/hooks/admin/use-ai-action-policies';
import { useTranslation } from '@/lib/i18n';

export default function AiActionPoliciesAdminPage(): ReactElement {
  const { t } = useTranslation();
  const {
    policies,
    isLoading,
    isError,
    error,
    pendingId,
    mutationError,
    clearMutationError,
    isCreating,
    onTogglePolicyActive,
    onDeletePolicy,
    onRetry,
    dialogOpen,
    setDialogOpen,
    editing,
    openCreate,
    openEdit,
    submitCreate,
    submitUpdate,
  } = useAiActionPoliciesPage();

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          title={t('adminAutomation.policies.title')}
          description={t('adminAutomation.policies.description')}
        />
        <Button
          type="button"
          onClick={openCreate}
          aria-label={t('adminAutomation.policies.addPolicy')}
        >
          <Plus className="mr-1 h-4 w-4" />
          {t('adminAutomation.policies.addPolicy')}
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">{t('adminAutomation.policies.loading')}</p>
      ) : null}

      {isError ? (
        <div
          className="flex items-center justify-between gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
          role="alert"
        >
          <span>{error?.message ?? t('adminAutomation.policies.error')}</span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onRetry}
            aria-label={t('adminAutomation.retry')}
          >
            {t('adminAutomation.retry')}
          </Button>
        </div>
      ) : null}

      {mutationError !== null ? (
        <div
          className="flex items-center justify-between gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
          role="alert"
        >
          <span>{mutationError.message || t('adminAutomation.policies.mutationError')}</span>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={clearMutationError}
            aria-label={t('adminAutomation.dismiss')}
          >
            {t('adminAutomation.dismiss')}
          </Button>
        </div>
      ) : null}

      {!isLoading && !isError && policies.length === 0 ? (
        <p className="rounded-lg border border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
          {t('adminAutomation.policies.empty')}
        </p>
      ) : null}

      {policies.length > 0 ? (
        <div className="flex flex-col gap-2">
          {policies.map((policy) => (
            <AiActionPolicyRow
              key={policy.id}
              policy={policy}
              onToggleActive={onTogglePolicyActive}
              onEdit={openEdit}
              onDelete={onDeletePolicy}
              isMutating={pendingId === policy.id}
              t={t}
            />
          ))}
        </div>
      ) : null}

      <PolicyFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode={editing === null ? AdminFormMode.CREATE : AdminFormMode.EDIT}
        initial={editing}
        onSubmitCreate={submitCreate}
        onSubmitUpdate={submitUpdate}
        isSubmitting={isCreating || pendingId === editing?.id}
        submitErrorMessage={mutationError?.message ?? null}
        t={t}
      />
    </div>
  );
}
