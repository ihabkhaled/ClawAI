'use client';

import type { ReactElement } from 'react';

import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import type { SuggestionRuleRowProps } from '@/types/ai-action-policy.types';

export function SuggestionRuleRow({
  rule,
  onToggleActive,
  onEdit,
  onDelete,
  isMutating,
  t,
}: SuggestionRuleRowProps): ReactElement {
  return (
    <div className="border-border bg-card flex flex-col gap-2 rounded-lg border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="min-w-0 text-sm font-semibold break-words">{rule.name}</span>
        {rule.isSystemDefault ? (
          <span className="rounded-full border border-blue-500/40 bg-blue-500/10 px-2 py-0.5 text-xs text-blue-600 dark:text-blue-400">
            {t('adminAutomation.rules.systemDefault')}
          </span>
        ) : null}
        <span className="text-muted-foreground flex w-full items-center justify-between gap-2 text-xs sm:ms-auto sm:w-auto">
          <span>{t('adminAutomation.rules.priority', { p: String(rule.priority) })}</span>
          <Switch
            checked={rule.isActive}
            onCheckedChange={(next) => onToggleActive(rule.id, next)}
            disabled={isMutating}
            aria-label={t('adminAutomation.rules.toggleActive')}
          />
        </span>
      </div>
      {rule.description !== null ? (
        <p className="text-muted-foreground text-xs">{rule.description}</p>
      ) : null}
      <div className="text-muted-foreground grid grid-cols-1 gap-1 text-xs md:grid-cols-2">
        <div>
          <span className="text-foreground font-semibold">
            {t('adminAutomation.rules.eventType')}
          </span>
          : <code className="bg-muted rounded px-1 break-all">{rule.eventType}</code>
        </div>
        <div>
          <span className="text-foreground font-semibold">
            {t('adminAutomation.rules.actionKind')}
          </span>
          : <code className="bg-muted rounded px-1 break-all">{rule.actionKindToSuggest}</code>
        </div>
        <div>
          <span className="text-foreground font-semibold">
            {t('adminAutomation.rules.providerRegex')}
          </span>
          : <code className="bg-muted rounded px-1 break-all">{rule.providerRegex}</code>
        </div>
        <div>
          <span className="text-foreground font-semibold">
            {t('adminAutomation.rules.contentRegex')}
          </span>
          : <code className="bg-muted rounded px-1 break-all">{rule.contentRegex}</code>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => onEdit(rule)}
          disabled={isMutating}
          aria-label={t('adminAutomation.rules.editRule')}
        >
          {t('common.edit')}
        </Button>
        {rule.isSystemDefault ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled
            title={t('adminAutomation.rules.cannotDelete')}
            aria-label={t('adminAutomation.rules.cannotDelete')}
          >
            {t('adminAutomation.rules.delete')}
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="destructive"
            onClick={() => onDelete(rule.id)}
            disabled={isMutating}
            aria-label={t('adminAutomation.rules.delete')}
          >
            {t('adminAutomation.rules.delete')}
          </Button>
        )}
      </div>
    </div>
  );
}
