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
import type { ApprovalEditDialogProps } from '@/types/approval-center.types';
import { serializeApprovalPayload } from '@/utilities/approval-edit.utility';

export function ApprovalEditDialog({
  action,
  open,
  onClose,
  onSave,
  isPending,
  t,
}: ApprovalEditDialogProps): ReactElement {
  const [payloadText, setPayloadText] = useState<string>('{}');
  const [reason, setReason] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (action !== null) {
      setPayloadText(serializeApprovalPayload(action.payload));
      setReason('');
      setError(null);
    }
  }, [action]);

  const handleSubmit = (): void => {
    if (action === null) {
      return;
    }
    try {
      const parsed = JSON.parse(payloadText) as Record<string, unknown>;
      onSave(action.id, parsed, reason.trim() === '' ? undefined : reason.trim());
    } catch (err) {
      const message = err instanceof Error ? err.message : t('approvals.edit.invalid_json');
      setError(message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(value) => (!value ? onClose() : undefined)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('approvals.edit.title')}</DialogTitle>
          <DialogDescription>{t('approvals.edit.description')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Textarea
            value={payloadText}
            onChange={(event) => setPayloadText(event.target.value)}
            rows={10}
            className="font-mono text-xs"
            aria-label={t('approvals.edit.payload_label')}
            disabled={isPending}
          />
          <Textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder={t('approvals.edit.reason_placeholder')}
            rows={2}
            disabled={isPending}
          />
          {error !== null ? <p className="text-sm text-red-500">{error}</p> : null}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
            {t('approvals.edit.cancel')}
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={isPending}>
            {t('approvals.edit.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
