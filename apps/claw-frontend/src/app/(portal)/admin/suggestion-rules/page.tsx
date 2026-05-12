'use client';

import { Plus } from 'lucide-react';
import type { ReactElement } from 'react';

import { RuleFormDialog } from '@/components/admin/rule-form-dialog';
import { SuggestionRuleRow } from '@/components/admin/suggestion-rule-row';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { AdminFormMode } from '@/enums/admin-form-mode.enum';
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
    isCreating,
    onToggleRuleActive,
    onDeleteRule,
    onRetry,
    dialogOpen,
    setDialogOpen,
    editing,
    openCreate,
    openEdit,
    submitCreate,
    submitUpdate,
  } = useSuggestionRulesPage();

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          title={t('adminAutomation.rules.title')}
          description={t('adminAutomation.rules.description')}
        />
        <Button
          type="button"
          onClick={openCreate}
          aria-label={t('adminAutomation.rules.addRule')}
        >
          <Plus className="mr-1 h-4 w-4" />
          {t('adminAutomation.rules.addRule')}
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">{t('adminAutomation.rules.loading')}</p>
      ) : null}

      {isError ? (
        <div
          className="flex items-center justify-between gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
          role="alert"
        >
          <span>{error?.message ?? t('adminAutomation.rules.error')}</span>
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
              onEdit={openEdit}
              onDelete={onDeleteRule}
              isMutating={pendingId === rule.id}
              t={t}
            />
          ))}
        </div>
      ) : null}

      <RuleFormDialog
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
