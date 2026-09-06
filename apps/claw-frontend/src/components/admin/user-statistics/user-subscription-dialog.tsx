'use client';

import type { ReactElement } from 'react';

import { UserSubscriptionDialogBody } from '@/components/admin/user-statistics/user-subscription-dialog-body';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { UserSubscriptionDialogProps } from '@/types/admin-user-statistics.types';

/**
 * "Subscription and billing" for one user, opened from a users-table row.
 *
 * The body is keyed on the user id so each open queries THAT user — a shared
 * instance would show the previously-opened account's invoices under the new
 * name until both refetches landed.
 *
 * No close control of our own: `DialogContent` already renders one.
 */
export function UserSubscriptionDialog({
  open,
  user,
  onClose,
  t,
}: UserSubscriptionDialogProps): ReactElement {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t('admin.userSubscriptionDialogTitle')}</DialogTitle>
          <DialogDescription>
            {user === null
              ? t('admin.userSubscriptionDialogDescription')
              : t('admin.userSubscriptionDialogDescriptionFor', { username: user.username })}
          </DialogDescription>
        </DialogHeader>

        {user === null ? null : <UserSubscriptionDialogBody key={user.id} userId={user.id} t={t} />}
      </DialogContent>
    </Dialog>
  );
}
