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
import { IMPL_HANDOFF_MODES } from '@/constants/impl-handoff.constants';
import { ImplHandoffMode } from '@/enums/impl-handoff-mode.enum';
import type { ImplHandoffPickerProps } from '@/types/impl-handoff.types';

export function ImplHandoffPickerDialog({
  open,
  onClose,
  onSubmit,
  isPending,
  errorMessage,
  fallbackHint,
  t,
}: ImplHandoffPickerProps): ReactElement {
  const handlePick = (mode: ImplHandoffMode): void => {
    void onSubmit(mode);
  };
  return (
    <Dialog open={open} onOpenChange={(v) => (!v ? onClose() : undefined)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('implHandoff.picker.title')}</DialogTitle>
          <DialogDescription>{t('implHandoff.picker.description')}</DialogDescription>
        </DialogHeader>
        {fallbackHint !== null ? (
          <p className="rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-xs text-amber-600 dark:text-amber-400">
            {fallbackHint}
          </p>
        ) : null}
        {errorMessage !== null ? (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
            {errorMessage}
          </p>
        ) : null}
        <div className="flex flex-col gap-2">
          {IMPL_HANDOFF_MODES.map((mode) => (
            <Button
              key={mode}
              type="button"
              variant={mode === ImplHandoffMode.CHAT ? 'default' : 'outline'}
              onClick={() => handlePick(mode)}
              disabled={isPending}
              className="justify-start"
            >
              <span className="font-semibold">{mode}</span>
              <span className="ml-2 text-xs text-muted-foreground">
                {t(`implHandoff.picker.${mode}.hint`)}
              </span>
            </Button>
          ))}
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>
            {t('implHandoff.picker.cancel')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
