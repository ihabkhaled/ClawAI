'use client';

import { UserLinkedAccountsDialogBody } from '@/components/admin/user-linked-accounts/user-linked-accounts-dialog-body';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { UserLinkedAccountsDialogProps } from '@/types/admin-security-settings.types';

/**
 * "Linked accounts" for one user, opened from the user detail dialog: other
 * accounts on the same device, device id or sign-up network (the one-trial-per-
 * device rule). No close button of our own: DialogContent renders one.
 */
export function UserLinkedAccountsDialog({
  open,
  user,
  locale,
  onClose,
  t,
}: UserLinkedAccountsDialogProps): React.ReactElement {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('adminSecurity.linkedAccounts.title')}</DialogTitle>
          <DialogDescription>
            {t('adminSecurity.linkedAccounts.description', { email: user?.email ?? '' })}
          </DialogDescription>
        </DialogHeader>
        {user === null ? null : (
          <UserLinkedAccountsDialogBody key={user.id} userId={user.id} locale={locale} t={t} />
        )}
      </DialogContent>
    </Dialog>
  );
}
