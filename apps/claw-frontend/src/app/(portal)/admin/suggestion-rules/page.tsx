'use client';

import type { ReactElement } from 'react';

import { SuggestionRuleRow } from '@/components/admin/suggestion-rule-row';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { useSuggestionRulesPage } from '@/hooks/admin/use-suggestion-rules';
import { useTranslation } from '@/lib/i18n';

export default function SuggestionRulesAdminPage(): ReactElement {
  const { t } = useTranslation();
  const {
    rules,
    isLoading,
    isError,
    error,
    pendingId,
    mutationError,
    clearMutationError,
    onToggleRuleActive,
    onDeleteRule,
  } = useSuggestionRulesPage();

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title={t('adminAutomation.rules.title')}
        description={t('adminAutomation.rules.description')}
      />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">{t('adminAutomation.rules.loading')}</p>
      ) : null}

      {isError ? (
        <p
          className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
          role="alert"
        >
          {error?.message ?? t('adminAutomation.rules.error')}
        </p>
      ) : null}

      {mutationError !== null ? (
        <div
          className="flex items-center justify-between gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
          role="alert"
        >
          <span>{mutationError.message || t('adminAutomation.rules.mutationError')}</span>
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

      {!isLoading && !isError && rules.length === 0 ? (
        <p className="rounded-lg border border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
          {t('adminAutomation.rules.empty')}
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
              isMutating={pendingId === rule.id}
              t={t}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
