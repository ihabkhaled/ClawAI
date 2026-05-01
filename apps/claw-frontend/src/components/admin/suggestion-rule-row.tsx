'use client';

import type { ReactElement } from 'react';

import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import type { SuggestionRuleRowProps } from '@/types/ai-action-policy.types';

export function SuggestionRuleRow({
  rule,
  onToggleActive,
  onDelete,
  isMutating,
  t,
}: SuggestionRuleRowProps): ReactElement {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold">{rule.name}</span>
        {rule.isSystemDefault ? (
          <span className="rounded-full border border-blue-500/40 bg-blue-500/10 px-2 py-0.5 text-xs text-blue-600 dark:text-blue-400">
            {t('admin.rules.systemDefault')}
          </span>
        ) : null}
        <span className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          <span>{t('admin.rules.priority', { p: String(rule.priority) })}</span>
          <Switch
            checked={rule.isActive}
            onCheckedChange={(next) => onToggleActive(rule.id, next)}
            disabled={isMutating}
            aria-label={t('admin.rules.toggleActive')}
          />
        </span>
      </div>
      {rule.description !== null ? (
        <p className="text-xs text-muted-foreground">{rule.description}</p>
      ) : null}
      <div className="grid gap-1 text-xs text-muted-foreground md:grid-cols-2">
        <div>
          <span className="font-semibold text-foreground">{t('admin.rules.eventType')}</span>:{' '}
          <code className="rounded bg-muted px-1">{rule.eventType}</code>
        </div>
        <div>
          <span className="font-semibold text-foreground">{t('admin.rules.actionKind')}</span>:{' '}
          <code className="rounded bg-muted px-1">{rule.actionKindToSuggest}</code>
        </div>
        <div>
          <span className="font-semibold text-foreground">{t('admin.rules.providerRegex')}</span>:{' '}
          <code className="rounded bg-muted px-1">{rule.providerRegex}</code>
        </div>
        <div>
          <span className="font-semibold text-foreground">{t('admin.rules.contentRegex')}</span>:{' '}
          <code className="rounded bg-muted px-1">{rule.contentRegex}</code>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {rule.isSystemDefault ? (
          <Button type="button" size="sm" variant="ghost" disabled title={t('admin.rules.cannotDelete')}>
            {t('admin.rules.delete')}
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="destructive"
            onClick={() => onDelete(rule.id)}
            disabled={isMutating}
          >
            {t('admin.rules.delete')}
          </Button>
        )}
      </div>
    </div>
  );
}
