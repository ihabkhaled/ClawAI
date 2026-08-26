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
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { AdminFormMode } from '@/enums/admin-form-mode.enum';
import { useRuleForm } from '@/hooks/admin/use-rule-form';
import type { RuleFormDialogProps } from '@/types/ai-action-policy.types';

export function RuleFormDialog({
  open,
  onOpenChange,
  mode,
  initial,
  onSubmitCreate,
  onSubmitUpdate,
  isSubmitting,
  submitErrorMessage,
  t,
}: RuleFormDialogProps): ReactElement {
  const { state, setField, fieldErrors, buildCreateRequest, buildUpdateRequest } = useRuleForm(
    initial ?? null,
  );

  const titleKey =
    mode === AdminFormMode.CREATE
      ? 'adminAutomation.rules.createTitle'
      : 'adminAutomation.rules.editTitle';
  const descKey =
    mode === AdminFormMode.CREATE
      ? 'adminAutomation.rules.createDescription'
      : 'adminAutomation.rules.editDescription';

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
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{t(titleKey)}</DialogTitle>
          <DialogDescription>{t(descKey)}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
          <div className="grid grid-cols-1 gap-2">
            <label htmlFor="rule-name" className="text-sm font-medium">
              {t('adminAutomation.rules.nameLabel')}
            </label>
            <Input
              id="rule-name"
              value={state.name}
              onChange={(e) => setField('name', e.target.value)}
              disabled={mode === AdminFormMode.EDIT}
              placeholder="github-pr-opened"
              aria-invalid={fieldErrors.name !== undefined}
            />
            <p className="text-muted-foreground text-xs">{t('adminAutomation.rules.nameHelp')}</p>
            {fieldErrors.name !== undefined ? (
              <p className="text-destructive text-xs">{fieldErrors.name}</p>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-2">
            <label htmlFor="rule-description" className="text-sm font-medium">
              {t('adminAutomation.rules.descriptionLabel')}
            </label>
            <Textarea
              id="rule-description"
              value={state.description}
              onChange={(e) => setField('description', e.target.value)}
              rows={2}
            />
            {fieldErrors.description !== undefined ? (
              <p className="text-destructive text-xs">{fieldErrors.description}</p>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-2">
            <label htmlFor="rule-event-type" className="text-sm font-medium">
              {t('adminAutomation.rules.eventType')}
            </label>
            <Input
              id="rule-event-type"
              value={state.eventType}
              onChange={(e) => setField('eventType', e.target.value)}
              aria-invalid={fieldErrors.eventType !== undefined}
            />
            <p className="text-muted-foreground text-xs">
              {t('adminAutomation.rules.eventTypeHelp')}
            </p>
            {fieldErrors.eventType !== undefined ? (
              <p className="text-destructive text-xs">{fieldErrors.eventType}</p>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-2 md:grid-cols-2 md:gap-4">
            <div className="grid grid-cols-1 gap-2">
              <label htmlFor="rule-provider-regex" className="text-sm font-medium">
                {t('adminAutomation.rules.providerRegex')}
              </label>
              <Input
                id="rule-provider-regex"
                value={state.providerRegex}
                onChange={(e) => setField('providerRegex', e.target.value)}
                aria-invalid={fieldErrors.providerRegex !== undefined}
              />
              {fieldErrors.providerRegex !== undefined ? (
                <p className="text-destructive text-xs">{fieldErrors.providerRegex}</p>
              ) : null}
            </div>
            <div className="grid grid-cols-1 gap-2">
              <label htmlFor="rule-content-regex" className="text-sm font-medium">
                {t('adminAutomation.rules.contentRegex')}
              </label>
              <Input
                id="rule-content-regex"
                value={state.contentRegex}
                onChange={(e) => setField('contentRegex', e.target.value)}
                aria-invalid={fieldErrors.contentRegex !== undefined}
              />
              {fieldErrors.contentRegex !== undefined ? (
                <p className="text-destructive text-xs">{fieldErrors.contentRegex}</p>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2">
            <label htmlFor="rule-action-kind" className="text-sm font-medium">
              {t('adminAutomation.rules.actionKind')}
            </label>
            <Input
              id="rule-action-kind"
              value={state.actionKindToSuggest}
              onChange={(e) => setField('actionKindToSuggest', e.target.value)}
              aria-invalid={fieldErrors.actionKindToSuggest !== undefined}
            />
            <p className="text-muted-foreground text-xs">
              {t('adminAutomation.rules.actionKindHelp')}
            </p>
            {fieldErrors.actionKindToSuggest !== undefined ? (
              <p className="text-destructive text-xs">{fieldErrors.actionKindToSuggest}</p>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-2">
            <label htmlFor="rule-priority" className="text-sm font-medium">
              {t('adminAutomation.rules.priorityLabel')}
            </label>
            <Input
              id="rule-priority"
              type="number"
              min={0}
              max={10000}
              value={state.priority}
              onChange={(e) => setField('priority', e.target.value)}
              aria-invalid={fieldErrors.priority !== undefined}
            />
            {fieldErrors.priority !== undefined ? (
              <p className="text-destructive text-xs">{fieldErrors.priority}</p>
            ) : null}
          </div>

          <div className="flex items-center justify-between gap-2">
            <label htmlFor="rule-is-active" className="text-sm font-medium">
              {t('adminAutomation.rules.isActiveLabel')}
            </label>
            <Switch
              id="rule-is-active"
              checked={state.isActive}
              onCheckedChange={(next) => setField('isActive', next)}
            />
          </div>

          {submitErrorMessage !== null ? (
            <p
              className="border-destructive/40 bg-destructive/10 text-destructive rounded-md border p-2 text-sm"
              role="alert"
            >
              {submitErrorMessage}
            </p>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? t('adminAutomation.rules.submitting')
                : t('adminAutomation.rules.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
