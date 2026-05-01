'use client';

import type { ReactElement } from 'react';

import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { AiActionPolicyKind } from '@/enums/ai-action-policy-kind.enum';
import type { AiActionPolicyRowProps } from '@/types/ai-action-policy.types';

export function AiActionPolicyRow({
  policy,
  onToggleActive,
  onDelete,
  isMutating,
  t,
}: AiActionPolicyRowProps): ReactElement {
  let kindStyle = 'border-border bg-muted/40';
  if (policy.kind === AiActionPolicyKind.DENY) {
    kindStyle = 'border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-400';
  } else if (policy.kind === AiActionPolicyKind.AUTO_APPROVE) {
    kindStyle = 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
  }
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3">
      <div className="flex items-center gap-2">
        <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${kindStyle}`}>
          {policy.kind}
        </span>
        <span className="text-sm font-semibold">{policy.name}</span>
        {policy.isSystemDefault ? (
          <span className="rounded-full border border-blue-500/40 bg-blue-500/10 px-2 py-0.5 text-xs text-blue-600 dark:text-blue-400">
            {t('admin.policies.systemDefault')}
          </span>
        ) : null}
        <span className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          <span>{t('admin.policies.priority', { p: String(policy.priority) })}</span>
          <Switch
            checked={policy.isActive}
            onCheckedChange={(next) => onToggleActive(policy.id, next)}
            disabled={isMutating}
            aria-label={t('admin.policies.toggleActive')}
          />
        </span>
      </div>
      {policy.description !== null ? (
        <p className="text-xs text-muted-foreground">{policy.description}</p>
      ) : null}
      <div className="grid gap-1 text-xs text-muted-foreground md:grid-cols-3">
        <div>
          <span className="font-semibold text-foreground">{t('admin.policies.providerRegex')}</span>:{' '}
          <code className="rounded bg-muted px-1">{policy.providerRegex}</code>
        </div>
        <div>
          <span className="font-semibold text-foreground">{t('admin.policies.actionKindRegex')}</span>:{' '}
          <code className="rounded bg-muted px-1">{policy.actionKindRegex}</code>
        </div>
        <div>
          <span className="font-semibold text-foreground">{t('admin.policies.riskCeiling')}</span>:{' '}
          {policy.riskMaxLabel} ≤ {policy.riskMaxScore}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {policy.isSystemDefault ? (
          <Button type="button" size="sm" variant="ghost" disabled title={t('admin.policies.cannotDelete')}>
            {t('admin.policies.delete')}
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="destructive"
            onClick={() => onDelete(policy.id)}
            disabled={isMutating}
          >
            {t('admin.policies.delete')}
          </Button>
        )}
      </div>
    </div>
  );
}
