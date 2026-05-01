'use client';

import type { ReactElement } from 'react';

import { SuggestionRuleRow } from '@/components/admin/suggestion-rule-row';
import { PageHeader } from '@/components/common/page-header';
import { useSuggestionRulesPage } from '@/hooks/admin/use-suggestion-rules';
import { useTranslation } from '@/lib/i18n';

export default function SuggestionRulesAdminPage(): ReactElement {
  const { t } = useTranslation();
  const { rules, isLoading, isError, error, isMutating, onToggleRuleActive, onDeleteRule } =
    useSuggestionRulesPage();

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader title={t('admin.rules.title')} description={t('admin.rules.description')} />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">{t('admin.rules.loading')}</p>
      ) : null}

      {isError ? (
        <p className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error?.message ?? t('admin.rules.error')}
        </p>
      ) : null}

      {!isLoading && !isError && rules.length === 0 ? (
        <p className="rounded-lg border border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
          {t('admin.rules.empty')}
        </p>
      ) : null}

      {rules.length > 0 ? (
        <div className="flex flex-col gap-2">
          {rules.map((rule) => (
            <SuggestionRuleRow
              key={rule.id}
              rule={rule}
              onToggleActive={onToggleRuleActive}
              onDelete={onDeleteRule}
              isMutating={isMutating}
              t={t}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
