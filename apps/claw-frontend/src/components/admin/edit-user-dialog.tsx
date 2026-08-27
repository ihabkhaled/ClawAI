'use client';

import { type ReactElement } from 'react';

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
import { AdminUserCapabilityReason } from '@/enums/admin-user-capability-reason.enum';
import { useEditUserForm } from '@/hooks/admin/use-edit-user-form';
import type { EditUserDialogProps } from '@/types/component.types';
import { resolveAdminUserCapability } from '@/utilities/admin-user-capability.utility';

export function EditUserDialog(props: EditUserDialogProps): ReactElement {
  const { open, user, actor, isSaving, isRotating, onClose, onSave, onRotatePassword, t } = props;
  const { form, submit } = useEditUserForm(user, onSave);
  const { errors, isValid } = form.formState;

  if (!user) {
    return <Dialog open={false} onOpenChange={onClose} />;
  }

  // The super administrator may rename themselves; role, status, plan, rotation
  // and delete stay locked even for them. See rules/35.
  const capability = resolveAdminUserCapability(user, actor);
  const fieldsLocked = !capability.canEditProfile;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('admin.editUserTitle')}</DialogTitle>
          <DialogDescription>{t('admin.editUserDescription')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="edit-user-username" className="text-sm leading-none font-medium">
              {t('admin.editUserUsername')}
            </label>
            <Input
              id="edit-user-username"
              autoComplete="off"
              disabled={fieldsLocked}
              error={Boolean(errors.username)}
              {...form.register('username')}
            />
            {errors.username ? (
              <p className="text-destructive text-xs">{t('admin.editUserUsernameInvalid')}</p>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="edit-user-first-name" className="text-sm leading-none font-medium">
                {t('admin.editUserFirstName')}
              </label>
              <Input
                id="edit-user-first-name"
                autoComplete="off"
                disabled={fieldsLocked}
                error={Boolean(errors.firstName)}
                {...form.register('firstName')}
              />
              {errors.firstName ? (
                <p className="text-destructive text-xs">{t('admin.editUserNameTooLong')}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <label htmlFor="edit-user-last-name" className="text-sm leading-none font-medium">
                {t('admin.editUserLastName')}
              </label>
              <Input
                id="edit-user-last-name"
                autoComplete="off"
                disabled={fieldsLocked}
                error={Boolean(errors.lastName)}
                {...form.register('lastName')}
              />
              {errors.lastName ? (
                <p className="text-destructive text-xs">{t('admin.editUserNameTooLong')}</p>
              ) : null}
            </div>
          </div>

          {capability.reason === null ? null : (
            <p className="text-muted-foreground border-border rounded-md border border-dashed p-3 text-sm">
              {capability.reason === AdminUserCapabilityReason.SuperAdminSelf
                ? t('admin.editUserSelfSuperAdminNotice')
                : t('admin.editUserSuperAdminNotice')}
            </p>
          )}

          <DialogFooter className="gap-2 pt-2 sm:justify-between sm:gap-0">
            <Button
              type="button"
              variant="destructive"
              onClick={() => onRotatePassword(user.id)}
              disabled={isRotating || !capability.canRotatePassword}
            >
              {t('admin.editUserRotatePassword')}
            </Button>
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button type="button" variant="outline" onClick={onClose}>
                {t('admin.editUserCancel')}
              </Button>
              <Button type="submit" disabled={isSaving || fieldsLocked || !isValid}>
                {t('admin.editUserSave')}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
