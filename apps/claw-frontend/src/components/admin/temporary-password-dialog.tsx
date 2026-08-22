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
import type { TemporaryPasswordDialogProps } from '@/types';

export function TemporaryPasswordDialog({
  open,
  isPending,
  onCancel,
  onConfirm,
  t,
}: TemporaryPasswordDialogProps): ReactElement {
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onCancel();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('admin.issueTemporaryPasswordConfirmTitle')}</DialogTitle>
          <DialogDescription>{t('admin.issueTemporaryPasswordConfirmBody')}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
            {t('common.cancel')}
          </Button>
          <Button type="button" onClick={onConfirm} disabled={isPending}>
            {t('admin.issueTemporaryPassword')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
