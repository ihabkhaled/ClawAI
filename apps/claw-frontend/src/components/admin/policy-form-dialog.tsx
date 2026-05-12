'use client';

import type { ReactElement } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  POLICY_KIND_OPTIONS,
  RISK_LABEL_OPTIONS,
} from '@/constants/admin-automation.constants';
import { AdminFormMode } from '@/enums/admin-form-mode.enum';
import type { AiActionPolicyKind } from '@/enums/ai-action-policy-kind.enum';
import type { RiskLabel } from '@/enums/risk-label.enum';
import { usePolicyForm } from '@/hooks/admin/use-policy-form';
import type { PolicyFormDialogProps } from '@/types/ai-action-policy.types';

export function PolicyFormDialog({
  open,
  onOpenChange,
  mode,
  initial,
  onSubmitCreate,
  onSubmitUpdate,
  isSubmitting,
  submitErrorMessage,
  t,
}: PolicyFormDialogProps): ReactElement {
  const { state, setField, fieldErrors, buildCreateRequest, buildUpdateRequest } =
    usePolicyForm(initial ?? null);

  const titleKey = mode === AdminFormMode.CREATE ? 'adminAutomation.policies.createTitle' : 'adminAutomation.policies.editTitle';
  const descKey =
    mode === AdminFormMode.CREATE
      ? 'adminAutomation.policies.createDescription'
      : 'adminAutomation.policies.editDescription';

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault();
    if (mode === AdminFormMode.CREATE) {
      const payload = buildCreateRequest();
      if (payload !== null) {
        onSubmitCreate(payload);
      }
    } else {
      const payload = buildUpdateRequest();
      if (payload !== null) {
        onSubmitUpdate(payload);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t(titleKey)}</DialogTitle>
          <DialogDescription>{t(descKey)}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <label htmlFor="policy-name" className="text-sm font-medium">
              {t('adminAutomation.policies.nameLabel')}
            </label>
            <Input
              id="policy-name"
              value={state.name}
              onChange={(e) => setField('name', e.target.value)}
              disabled={mode === AdminFormMode.EDIT}
              placeholder="deny-pii"
              aria-invalid={fieldErrors.name !== undefined}
            />
            <p className="text-xs text-muted-foreground">{t('adminAutomation.policies.nameHelp')}</p>
            {fieldErrors.name !== undefined ? (
              <p className="text-xs text-destructive">{fieldErrors.name}</p>
            ) : null}
          </div>

          <div className="grid gap-2">
            <label htmlFor="policy-description" className="text-sm font-medium">
              {t('adminAutomation.policies.descriptionLabel')}
            </label>
            <Textarea
              id="policy-description"
              value={state.description}
              onChange={(e) => setField('description', e.target.value)}
              rows={2}
            />
            {fieldErrors.description !== undefined ? (
              <p className="text-xs text-destructive">{fieldErrors.description}</p>
            ) : null}
          </div>

          <div className="grid gap-2">
            <label htmlFor="policy-kind" className="text-sm font-medium">
              {t('adminAutomation.policies.kindFieldLabel')}
            </label>
            <Select
              value={state.kind}
              onValueChange={(value: string) => setField('kind', value as AiActionPolicyKind)}
            >
              <SelectTrigger id="policy-kind">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {POLICY_KIND_OPTIONS.map((kind) => (
                  <SelectItem key={kind} value={kind}>
                    {t(`adminAutomation.policies.kindLabel.${kind}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2 md:grid-cols-2 md:gap-4">
            <div className="grid gap-2">
              <label htmlFor="policy-provider-regex" className="text-sm font-medium">
                {t('adminAutomation.policies.providerRegex')}
              </label>
              <Input
                id="policy-provider-regex"
                value={state.providerRegex}
                onChange={(e) => setField('providerRegex', e.target.value)}
                aria-invalid={fieldErrors.providerRegex !== undefined}
              />
              {fieldErrors.providerRegex !== undefined ? (
                <p className="text-xs text-destructive">{fieldErrors.providerRegex}</p>
              ) : null}
            </div>
            <div className="grid gap-2">
              <label htmlFor="policy-action-regex" className="text-sm font-medium">
                {t('adminAutomation.policies.actionKindRegex')}
              </label>
              <Input
                id="policy-action-regex"
                value={state.actionKindRegex}
                onChange={(e) => setField('actionKindRegex', e.target.value)}
                aria-invalid={fieldErrors.actionKindRegex !== undefined}
              />
              {fieldErrors.actionKindRegex !== undefined ? (
                <p className="text-xs text-destructive">{fieldErrors.actionKindRegex}</p>
              ) : null}
            </div>
          </div>

          <div className="grid gap-2 md:grid-cols-2 md:gap-4">
            <div className="grid gap-2">
              <label htmlFor="policy-risk-label" className="text-sm font-medium">
                {t('adminAutomation.policies.riskCeiling')}
              </label>
              <Select
                value={state.riskMaxLabel}
                onValueChange={(value: string) =>
                  setField('riskMaxLabel', value as RiskLabel)
                }
              >
                <SelectTrigger id="policy-risk-label">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RISK_LABEL_OPTIONS.map((label) => (
                    <SelectItem key={label} value={label}>
                      {t(`adminAutomation.policies.riskLabel.${label}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <label htmlFor="policy-risk-score" className="text-sm font-medium">
                {t('adminAutomation.policies.riskMaxScoreLabel')}
              </label>
              <Input
                id="policy-risk-score"
                type="number"
                min={0}
                max={100}
                value={state.riskMaxScore}
                onChange={(e) => setField('riskMaxScore', e.target.value)}
                aria-invalid={fieldErrors.riskMaxScore !== undefined}
              />
              {fieldErrors.riskMaxScore !== undefined ? (
                <p className="text-xs text-destructive">{fieldErrors.riskMaxScore}</p>
              ) : null}
            </div>
          </div>

          <div className="grid gap-2">
            <label htmlFor="policy-priority" className="text-sm font-medium">
              {t('adminAutomation.policies.priorityLabel')}
            </label>
            <Input
              id="policy-priority"
              type="number"
              min={0}
              max={10000}
              value={state.priority}
              onChange={(e) => setField('priority', e.target.value)}
              aria-invalid={fieldErrors.priority !== undefined}
            />
            {fieldErrors.priority !== undefined ? (
              <p className="text-xs text-destructive">{fieldErrors.priority}</p>
            ) : null}
          </div>

          <div className="flex items-center justify-between gap-2">
            <label htmlFor="policy-require-reason" className="text-sm font-medium">
              {t('adminAutomation.policies.requireReasonLabel')}
            </label>
            <Switch
              id="policy-require-reason"
              checked={state.requireReason}
              onCheckedChange={(next) => setField('requireReason', next)}
            />
          </div>

          <div className="flex items-center justify-between gap-2">
            <label htmlFor="policy-is-active" className="text-sm font-medium">
              {t('adminAutomation.policies.isActiveLabel')}
            </label>
            <Switch
              id="policy-is-active"
              checked={state.isActive}
              onCheckedChange={(next) => setField('isActive', next)}
            />
          </div>

          {submitErrorMessage !== null ? (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-sm text-destructive" role="alert">
              {submitErrorMessage}
            </p>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? t('adminAutomation.policies.submitting')
                : t('adminAutomation.policies.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
