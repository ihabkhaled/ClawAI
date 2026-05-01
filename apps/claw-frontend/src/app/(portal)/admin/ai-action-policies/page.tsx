'use client';

import type { ReactElement } from 'react';

import { AiActionPolicyRow } from '@/components/admin/ai-action-policy-row';
import { PageHeader } from '@/components/common/page-header';
import { useAiActionPoliciesPage } from '@/hooks/admin/use-ai-action-policies';
import { useTranslation } from '@/lib/i18n';

export default function AiActionPoliciesAdminPage(): ReactElement {
  const { t } = useTranslation();
  const {
    policies,
    isLoading,
    isError,
    error,
    isMutating,
    onTogglePolicyActive,
    onDeletePolicy,
  } = useAiActionPoliciesPage();

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader title={t('admin.policies.title')} description={t('admin.policies.description')} />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">{t('admin.policies.loading')}</p>
      ) : null}

      {isError ? (
        <p className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error?.message ?? t('admin.policies.error')}
        </p>
      ) : null}

      {!isLoading && !isError && policies.length === 0 ? (
        <p className="rounded-lg border border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
          {t('admin.policies.empty')}
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
              isMutating={isMutating}
              t={t}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
