import { useEffect, useState } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import type { ApprovalRejectDialogProps } from '@/types/approval-center.types';

export function ApprovalRejectDialog({
  actionId,
  open,
  onClose,
  onSubmit,
  isPending,
  t,
}: ApprovalRejectDialogProps): ReactElement {
  const [reason, setReason] = useState<string>('');

  useEffect(() => {
    if (actionId === null) {
      setReason('');
    }
  }, [actionId]);

  const handleSubmit = (): void => {
    if (actionId === null) {
      return;
    }
    const trimmed = reason.trim();
    onSubmit(actionId, trimmed === '' ? undefined : trimmed);
  };

  return (
    <Dialog open={open} onOpenChange={(value) => (!value ? onClose() : undefined)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('approvals.reject.title')}</DialogTitle>
          <DialogDescription>{t('approvals.reject.description')}</DialogDescription>
        </DialogHeader>
        <Textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          rows={4}
          placeholder={t('approvals.reject.reason_placeholder')}
          disabled={isPending}
        />
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
            {t('approvals.reject.cancel')}
          </Button>
          <Button type="button" variant="destructive" onClick={handleSubmit} disabled={isPending}>
            {t('approvals.reject.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
