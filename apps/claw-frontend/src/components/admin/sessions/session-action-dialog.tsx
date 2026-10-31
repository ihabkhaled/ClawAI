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
import type { SessionActionDialogProps } from '@/types/admin-sessions.types';
import { resolveSessionActionCopy } from '@/utilities/admin-sessions.utility';

/**
 * Confirms ending or clearing sessions. When it would end the administrator's OWN current
 * login, the dialog says so in a highlighted line: pressing the red button is the explicit
 * confirmation the server requires.
 */
export function SessionActionDialog({
  target,
  isOwnAccount,
  isActing,
  onConfirm,
  onClose,
  t,
}: SessionActionDialogProps): ReactElement {
  if (target === null) {
    return <Dialog open={false} onOpenChange={onClose} />;
  }
  const copy = resolveSessionActionCopy(target, isOwnAccount);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md" data-testid="session-action-dialog">
        <DialogHeader>
          <DialogTitle>{t(copy.titleKey)}</DialogTitle>
          <DialogDescription>{t(copy.bodyKey)}</DialogDescription>
        </DialogHeader>
        {copy.endsCurrentSession ? (
          <p
            role="alert"
            className="bg-warning-surface text-warning rounded-md px-3 py-2 text-sm font-medium"
            data-testid="session-current-warning"
          >
            {t('adminSessions.currentWarning')}
          </p>
        ) : null}
        <DialogFooter className="gap-2 pt-2 sm:justify-end sm:gap-0">
          <Button type="button" variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            type="button"
            variant={copy.destructive ? 'destructive' : 'default'}
            disabled={isActing}
            onClick={onConfirm}
            data-testid="session-action-confirm"
          >
            {t(copy.confirmKey)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
