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
import { Textarea } from '@/components/ui/textarea';
import {
  BAN_AMOUNT_MAX,
  BAN_DURATION_UNIT_OPTIONS,
  BAN_REASON_MAX_LENGTH,
} from '@/constants/admin-user-management.constants';
import { useBanUserForm } from '@/hooks/admin/use-ban-user-form';
import type { BanUserDialogProps } from '@/types';

export function BanUserDialog({
  open,
  user,
  isSaving,
  onClose,
  onConfirm,
  t,
}: BanUserDialogProps): ReactElement {
  const { form, isTimed, submit } = useBanUserForm(user, onConfirm, onClose);
  const { errors, isValid } = form.formState;

  if (!user) {
    return <Dialog open={false} onOpenChange={onClose} />;
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('admin.banDialogTitle', { username: user.username })}</DialogTitle>
          <DialogDescription>{t('admin.banDialogDescription')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label htmlFor="ban-user-unit" className="text-sm leading-none font-medium">
                {t('admin.banUnit')}
              </label>
              <select
                id="ban-user-unit"
                className="input-focus-ring border-input bg-background touch:min-h-11 flex h-10 w-full rounded-md border px-3 py-2 text-sm"
                {...form.register('unit')}
              >
                {BAN_DURATION_UNIT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {t(option.labelKey)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label htmlFor="ban-user-amount" className="text-sm leading-none font-medium">
                {t('admin.banAmount')}
              </label>
              <Input
                id="ban-user-amount"
                type="number"
                min={1}
                max={BAN_AMOUNT_MAX}
                autoComplete="off"
                disabled={!isTimed}
                error={isTimed && Boolean(errors.amount)}
                {...form.register('amount', { valueAsNumber: true })}
              />
              {isTimed && errors.amount ? (
                <p className="text-destructive text-xs">{t('admin.banAmountInvalid')}</p>
              ) : null}
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="ban-user-reason" className="text-sm leading-none font-medium">
              {t('admin.banReason')}
            </label>
            <Textarea
              id="ban-user-reason"
              maxLength={BAN_REASON_MAX_LENGTH}
              placeholder={t('admin.banReasonPlaceholder')}
              {...form.register('reason')}
            />
            {errors.reason ? (
              <p className="text-destructive text-xs">{t('admin.banReasonRequired')}</p>
            ) : null}
          </div>

          <DialogFooter className="gap-2 pt-2 sm:justify-end sm:gap-0">
            <Button type="button" variant="outline" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" variant="destructive" disabled={isSaving || !isValid}>
              {t('admin.banConfirm')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
