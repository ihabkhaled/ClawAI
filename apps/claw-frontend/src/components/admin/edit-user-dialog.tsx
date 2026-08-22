'use client';

import { type ReactElement, useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import type { AdminUserUpdateRequest } from '@/types/auth.types';
import type { EditUserDialogProps } from '@/types/component.types';

export function EditUserDialog(props: EditUserDialogProps): ReactElement {
  const { open, user, isSaving, isRotating, onClose, onSave, onRotatePassword, t } = props;

  const usernameRegex = /^[a-zA-Z0-9_-]+$/;

  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  useEffect(() => {
    if (user) {
      setUsername(user.username ?? '');
      setFirstName(user.firstName ?? '');
      setLastName(user.lastName ?? '');
    }
  }, [user]);

  if (!user) {
    return <Dialog open={false} onOpenChange={onClose} />;
  }

  const isSuperAdmin = user.isSuperAdmin;

  const trimmedUsername = username.trim();
  const isUsernameValid =
    trimmedUsername.length >= 3 &&
    trimmedUsername.length <= 32 &&
    usernameRegex.test(trimmedUsername);

  const isFirstNameValid = firstName.trim().length <= 64;
  const isLastNameValid = lastName.trim().length <= 64;

  const canSave =
    !isSaving && !isSuperAdmin && isUsernameValid && isFirstNameValid && isLastNameValid;

  const handleSave = (): void => {
    if (!canSave || !user) {
      return;
    }
    const updateRequest: AdminUserUpdateRequest = {
      username: username.trim(),
      firstName: firstName.trim() || null,
      lastName: lastName.trim() || null,
    };
    onSave(user.id, updateRequest);
  };

  const handleRotatePassword = (): void => {
    if (!user) {
      return;
    }
    onRotatePassword(user.id);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('admin.editUserTitle')}</DialogTitle>
          <DialogDescription>{t('admin.editUserDescription')}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="username" className="text-sm leading-none font-medium">
              {t('admin.editUserUsername')}
            </label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="col-span-3"
              disabled={isSuperAdmin}
            />
          </div>
          {!isUsernameValid && (
            <div className="text-destructive col-span-3 col-start-2 text-sm">
              {t('admin.editUserUsernameInvalid')}
            </div>
          )}

          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="firstName" className="text-sm leading-none font-medium">
              {t('admin.editUserFirstName')}
            </label>
            <Input
              id="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="col-span-3"
              disabled={isSuperAdmin}
            />
          </div>
          {!isFirstNameValid && (
            <div className="text-destructive col-span-3 col-start-2 text-sm">
              {t('admin.editUserNameTooLong')}
            </div>
          )}

          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="lastName" className="text-sm leading-none font-medium">
              {t('admin.editUserLastName')}
            </label>
            <Input
              id="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="col-span-3"
              disabled={isSuperAdmin}
            />
          </div>
          {!isLastNameValid && (
            <div className="text-destructive col-span-3 col-start-2 text-sm">
              {t('admin.editUserNameTooLong')}
            </div>
          )}

          {isSuperAdmin && (
            <p className="text-muted-foreground pt-2 text-center text-sm">
              {t('admin.editUserSuperAdminNotice')}
            </p>
          )}
        </div>

        <DialogFooter className="sm:justify-between">
          <div>
            <Button
              variant="destructive"
              onClick={handleRotatePassword}
              disabled={isRotating || isSuperAdmin}
            >
              {t('admin.editUserRotatePassword')}
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              {t('admin.editUserCancel')}
            </Button>
            <Button onClick={handleSave} disabled={!canSave}>
              {t('admin.editUserSave')}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
