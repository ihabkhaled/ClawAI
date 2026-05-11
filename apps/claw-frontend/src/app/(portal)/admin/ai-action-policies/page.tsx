'use client';

import type { ReactElement } from 'react';

import { AiActionPolicyRow } from '@/components/admin/ai-action-policy-row';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
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
    onTogglePolicyActive,
    onDeletePolicy,
  } = useAiActionPoliciesPage();

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title={t('adminAutomation.policies.title')}
        description={t('adminAutomation.policies.description')}
      />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">{t('adminAutomation.policies.loading')}</p>
      ) : null}

      {isError ? (
        <p
          className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
          role="alert"
        >
          {error?.message ?? t('adminAutomation.policies.error')}
        </p>
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
              onDelete={onDeletePolicy}
              isMutating={pendingId === policy.id}
              t={t}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
