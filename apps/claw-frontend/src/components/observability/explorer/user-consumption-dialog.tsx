import type { ReactElement } from 'react';

import { UserConsumptionBody } from '@/components/observability/explorer/user-consumption-body';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { UserConsumptionDialogProps } from '@/types/observability-explorer.types';

/**
 * A user's full consumption, opened from a user row. Opening it is an audited
 * admin action on the server. No close control of our own: DialogContent has one.
 */
export function UserConsumptionDialog({
  userId,
  initialScope,
  onClose,
  t,
}: UserConsumptionDialogProps): ReactElement {
  return (
    <Dialog
      open={userId !== null}
      onOpenChange={(next) => {
        if (!next) {
          onClose();
        }
      }}
    >
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>{t('observabilityExplorer.userDialogTitle')}</DialogTitle>
          <DialogDescription>{t('observabilityExplorer.userDialogDescription')}</DialogDescription>
        </DialogHeader>
        {userId === null ? null : (
          <UserConsumptionBody key={userId} userId={userId} initialScope={initialScope} t={t} />
        )}
      </DialogContent>
    </Dialog>
  );
}
