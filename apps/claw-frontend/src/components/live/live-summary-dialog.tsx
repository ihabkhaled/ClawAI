import { FileText } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { LiveSummaryDialogProps } from '@/types/live.types';

/**
 * "Summarize video": says what the one-click summary uses before it runs (the video's length as
 * Live minutes, free first) and which part, if any, is paid; confirming also approves those paid
 * minutes. Open while `estimate` is not null.
 */
export function LiveSummaryDialog({
  estimate,
  t,
  onConfirm,
  onCancel,
}: LiveSummaryDialogProps): React.ReactElement {
  return (
    <Dialog open={estimate !== null} onOpenChange={(open) => (open ? undefined : onCancel())}>
      <DialogContent data-testid="live-summary-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="text-primary h-4 w-4" aria-hidden="true" />
            {t('live.summary.dialogTitle')}
          </DialogTitle>
          <DialogDescription>{t('live.summary.dialogDescription')}</DialogDescription>
        </DialogHeader>
        {estimate ? (
          <ul className="text-foreground flex flex-col gap-1 text-sm">
            <li>
              {estimate.minutes === null
                ? t('live.summary.lengthUnknown')
                : t('live.summary.uses', { minutes: estimate.minutes })}
            </li>
            <li>{t('live.summary.freeLeft', { minutes: estimate.freeMinutesLeft })}</li>
            {estimate.paidMinutes > 0 ? (
              <li className="text-warning font-medium" role="note">
                {t('live.summary.paid', { minutes: estimate.paidMinutes })}
              </li>
            ) : null}
          </ul>
        ) : null}
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            {t('live.summary.cancel')}
          </Button>
          <Button onClick={onConfirm} data-testid="live-summary-confirm">
            {estimate !== null && estimate.paidMinutes > 0
              ? t('live.summary.confirmPaid')
              : t('live.summary.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
