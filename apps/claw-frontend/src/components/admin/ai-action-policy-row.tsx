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
  onEdit,
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
    <div className="border-border bg-card flex flex-col gap-2 rounded-lg border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${kindStyle}`}
          aria-label={kindLabel}
        >
          {kindLabel}
        </span>
        <span className="min-w-0 text-sm font-semibold break-words">{policy.name}</span>
        {policy.isSystemDefault ? (
          <span className="rounded-full border border-blue-500/40 bg-blue-500/10 px-2 py-0.5 text-xs text-blue-600 dark:text-blue-400">
            {t('adminAutomation.policies.systemDefault')}
          </span>
        ) : null}
        <span className="text-muted-foreground flex w-full items-center justify-between gap-2 text-xs sm:ms-auto sm:w-auto">
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
        <p className="text-muted-foreground text-xs">{policy.description}</p>
      ) : null}
      <div className="text-muted-foreground grid grid-cols-1 gap-1 text-xs md:grid-cols-3">
        <div>
          <span className="text-foreground font-semibold">
            {t('adminAutomation.policies.providerRegex')}
          </span>
          : <code className="bg-muted rounded px-1 break-all">{policy.providerRegex}</code>
        </div>
        <div>
          <span className="text-foreground font-semibold">
            {t('adminAutomation.policies.actionKindRegex')}
          </span>
          : <code className="bg-muted rounded px-1 break-all">{policy.actionKindRegex}</code>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-foreground font-semibold">
            {t('adminAutomation.policies.riskCeiling')}
          </span>
          :{' '}
          <span className={`rounded-full border px-2 py-0.5 ${riskBadgeStyle}`}>
            {riskLabelText}
          </span>
          <span>≤ {policy.riskMaxScore}</span>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => onEdit(policy)}
          disabled={isMutating}
          aria-label={t('adminAutomation.policies.editPolicy')}
        >
          {t('common.edit')}
        </Button>
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
