'use client';

import type { ReactElement } from 'react';

import { UserUsageDialogBody } from '@/components/admin/user-statistics/user-usage-dialog-body';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { UserUsageDialogProps } from '@/types/admin-user-statistics.types';

/**
 * "Usage and consumption" for one user, opened from a users-table row.
 *
 * The body is keyed on the user id so each open queries THAT user — a shared
 * instance would show the previously-opened account's tokens under the new
 * name until the refetch landed.
 *
 * No close control of our own: `DialogContent` already renders one, and a
 * second X leaves the operator guessing which control owns the panel.
 */
export function UserUsageDialog({ open, user, onClose, t }: UserUsageDialogProps): ReactElement {
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
          <DialogTitle>{t('admin.userUsageDialogTitle')}</DialogTitle>
          <DialogDescription>
            {user === null
              ? t('admin.userUsageDialogDescription')
              : t('admin.userUsageDialogDescriptionFor', { username: user.username })}
          </DialogDescription>
        </DialogHeader>

        {user === null ? null : <UserUsageDialogBody key={user.id} userId={user.id} t={t} />}
      </DialogContent>
    </Dialog>
  );
}
