'use client';

import type { ReactElement } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import type { AutomationPreferenceRowProps } from '@/types/automation-preference.types';

export function AutomationPreferenceRow({
  preference,
  onSave,
  isPending,
  t,
}: AutomationPreferenceRowProps): ReactElement {
  const handleToggleEnabled = (next: boolean): void => {
    onSave(preference.actionKind, { isEnabled: next });
  };

  const handleSliderChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const numeric = Number(event.target.value);
    onSave(preference.actionKind, {
      autoApproveBelowRiskScore: Number.isFinite(numeric) ? numeric : null,
    });
  };

  const handleBudgetChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const raw = event.target.value.trim();
    if (raw.length === 0) {
      onSave(preference.actionKind, { perDayBudget: null });
      return;
    }
    const parsed = Number.parseInt(raw, 10);
    if (!Number.isFinite(parsed) || parsed < 0) {
      return;
    }
    onSave(preference.actionKind, { perDayBudget: parsed });
  };

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-sm font-semibold">{preference.actionKind}</span>
          <span className="text-xs text-muted-foreground">
            {preference.isEnabled
              ? t('automationPreferences.row.enabled')
              : t('automationPreferences.row.disabled')}
          </span>
        </div>
        <Switch
          checked={preference.isEnabled}
          onCheckedChange={handleToggleEnabled}
          disabled={isPending}
          aria-label={t('automationPreferences.row.toggleAria', { kind: preference.actionKind })}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs text-muted-foreground" htmlFor={`auto-approve-${preference.actionKind}`}>
          {t('automationPreferences.row.autoApproveBelowRisk')}
        </label>
        <input
          id={`auto-approve-${preference.actionKind}`}
          type="range"
          min={0}
          max={100}
          step={5}
          value={preference.autoApproveBelowRiskScore ?? 0}
          onChange={handleSliderChange}
          disabled={isPending || !preference.isEnabled}
          aria-label={t('automationPreferences.row.autoApproveBelowRisk')}
        />
        <span className="text-xs">
          {preference.autoApproveBelowRiskScore === null
            ? t('automationPreferences.row.autoApproveDisabled')
            : t('automationPreferences.row.autoApproveAt', {
                score: String(preference.autoApproveBelowRiskScore),
              })}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <label className="text-xs text-muted-foreground" htmlFor={`per-day-${preference.actionKind}`}>
          {t('automationPreferences.row.perDayBudget')}
        </label>
        <Input
          id={`per-day-${preference.actionKind}`}
          type="number"
          min={0}
          max={10_000}
          value={preference.perDayBudget ?? ''}
          onChange={handleBudgetChange}
          disabled={isPending || !preference.isEnabled}
          className="w-24"
          placeholder={t('automationPreferences.row.perDayBudgetPlaceholder')}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onSave(preference.actionKind, { perDayBudget: null })}
          disabled={isPending || preference.perDayBudget === null}
        >
          {t('automationPreferences.row.clear')}
        </Button>
      </div>
    </div>
  );
}
