'use client';

import { type ReactElement } from 'react';

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
import { Textarea } from '@/components/ui/textarea';
import { useAssignPlanForm } from '@/hooks/admin/use-assign-plan-form';
import type { AssignPlanDialogProps } from '@/types/component.types';

export function AssignPlanDialog(props: AssignPlanDialogProps): ReactElement {
  const { open, user, targetPlanId, isSaving, onClose, onSave, t } = props;
  const { form, submit } = useAssignPlanForm(user, targetPlanId, onSave);
  const { errors, isValid } = form.formState;

  if (!user || !targetPlanId) {
    return <Dialog open={false} onOpenChange={onClose} />;
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('admin.assignPlanDialogTitle')}</DialogTitle>
          <DialogDescription>{t('admin.assignPlanDialogDescription')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="assign-plan-duration" className="text-sm leading-none font-medium">
              {t('admin.assignPlanDurationLabel')}
            </label>
            <Input
              id="assign-plan-duration"
              type="number"
              min={1}
              max={60}
              autoComplete="off"
              error={Boolean(errors.durationMonths)}
              {...form.register('durationMonths', { valueAsNumber: true })}
            />
            {errors.durationMonths ? (
              <p className="text-destructive text-xs">{t('admin.assignPlanDurationInvalid')}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label htmlFor="assign-plan-reason" className="text-sm leading-none font-medium">
              {t('admin.assignPlanReasonLabel')}
            </label>
            <Textarea id="assign-plan-reason" {...form.register('grantReason')} />
            {errors.grantReason ? (
              <p className="text-destructive text-xs">{t('admin.assignPlanReasonRequired')}</p>
            ) : null}
          </div>

          <DialogFooter className="gap-2 pt-2 sm:justify-end sm:gap-0">
            <Button type="button" variant="outline" onClick={onClose}>
              {t('admin.assignPlanCancel')}
            </Button>
            <Button type="submit" disabled={isSaving || !isValid}>
              {t('admin.assignPlanConfirm')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
