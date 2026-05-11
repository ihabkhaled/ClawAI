'use client';

import type { ReactElement } from 'react';

import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { POLICY_KIND_STYLES } from '@/constants/admin-automation.constants';
import { WORKSPACE_RISK_LABEL_STYLES } from '@/constants/workspace-risk-badge.constants';
import type { AiActionPolicyRowProps } from '@/types/ai-action-policy.types';
import type { AiActionRiskLabel } from '@/types/workspace.types';

export function AiActionPolicyRow({
  policy,
  onToggleActive,
  onDelete,
  isMutating,
  t,
}: AiActionPolicyRowProps): ReactElement {
  const kindStyle = POLICY_KIND_STYLES[policy.kind];
  const kindLabel = t(`adminAutomation.policies.kindLabel.${policy.kind}`);
  const riskLabelKey = policy.riskMaxLabel as AiActionRiskLabel;
  const riskBadgeStyle = WORKSPACE_RISK_LABEL_STYLES[riskLabelKey];
  const riskLabelText = t(`adminAutomation.policies.riskLabel.${policy.riskMaxLabel}`);
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3">
      <div className="flex items-center gap-2">
        <span
          className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${kindStyle}`}
          aria-label={kindLabel}
        >
          {kindLabel}
        </span>
        <span className="text-sm font-semibold">{policy.name}</span>
        {policy.isSystemDefault ? (
          <span className="rounded-full border border-blue-500/40 bg-blue-500/10 px-2 py-0.5 text-xs text-blue-600 dark:text-blue-400">
            {t('adminAutomation.policies.systemDefault')}
          </span>
        ) : null}
        <span className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          <span>{t('adminAutomation.policies.priority', { p: String(policy.priority) })}</span>
          <Switch
            checked={policy.isActive}
            onCheckedChange={(next) => onToggleActive(policy.id, next)}
            disabled={isMutating}
            aria-label={t('adminAutomation.policies.toggleActive')}
          />
        </span>
      </div>
      {policy.description !== null ? (
        <p className="text-xs text-muted-foreground">{policy.description}</p>
      ) : null}
      <div className="grid gap-1 text-xs text-muted-foreground md:grid-cols-3">
        <div>
          <span className="font-semibold text-foreground">
            {t('adminAutomation.policies.providerRegex')}
          </span>
          : <code className="rounded bg-muted px-1">{policy.providerRegex}</code>
        </div>
        <div>
          <span className="font-semibold text-foreground">
            {t('adminAutomation.policies.actionKindRegex')}
          </span>
          : <code className="rounded bg-muted px-1">{policy.actionKindRegex}</code>
        </div>
        <div className="flex items-center gap-1">
          <span className="font-semibold text-foreground">
            {t('adminAutomation.policies.riskCeiling')}
          </span>
          :{' '}
          <span className={`rounded-full border px-2 py-0.5 ${riskBadgeStyle}`}>
            {riskLabelText}
          </span>
          <span>≤ {policy.riskMaxScore}</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {policy.isSystemDefault ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled
            title={t('adminAutomation.policies.cannotDelete')}
            aria-label={t('adminAutomation.policies.cannotDelete')}
          >
            {t('adminAutomation.policies.delete')}
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="destructive"
            onClick={() => onDelete(policy.id)}
            disabled={isMutating}
            aria-label={t('adminAutomation.policies.delete')}
          >
            {t('adminAutomation.policies.delete')}
          </Button>
        )}
      </div>
    </div>
  );
}
