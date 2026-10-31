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
import {
  countryFlagEmoji,
  formatAdminTimestamp,
  formatCountryLabel,
  formatRegistrationIp,
} from '@/utilities/admin-user-management.utility';

export function EditUserDialog(props: EditUserDialogProps): ReactElement {
  const {
    open,
    user,
    actor,
    isSaving,
    isRotating,
    onClose,
    onSave,
    onRotatePassword,
    onSetPassword,
    onBan,
    onUnban,
    isUnbanning,
    locale,
    t,
  } = props;
  const { form, submit } = useEditUserForm(user, onSave);
  const { errors, isValid } = form.formState;

  if (!user) {
    return <Dialog open={false} onOpenChange={onClose} />;
  }

  // The super administrator may rename themselves; role, status, plan, rotation
  // and delete stay locked even for them. See rules/35.
  const capability = resolveAdminUserCapability(user, actor);
  const fieldsLocked = !capability.canEditProfile;
  const flag = countryFlagEmoji(user.registrationCountryCode);

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

          <div className="space-y-2">
            <label htmlFor="edit-user-phone" className="text-sm leading-none font-medium">
              {t('admin.editUserPhone')}
            </label>
            <Input
              id="edit-user-phone"
              type="tel"
              autoComplete="off"
              placeholder="+201001234567"
              disabled={fieldsLocked}
              error={Boolean(errors.phone)}
              {...form.register('phone')}
            />
            {errors.phone ? (
              <p className="text-destructive text-xs">{t('admin.editUserPhoneInvalid')}</p>
            ) : (
              <p className="text-muted-foreground text-xs">{t('admin.editUserPhoneHint')}</p>
            )}
          </div>

          <dl className="border-border grid grid-cols-1 gap-2 rounded-md border p-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">{t('admin.detailRegistrationIp')}</dt>
              <dd className="font-medium" data-testid="edit-registration-ip">
                {formatRegistrationIp(user.registrationIp)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t('admin.detailRegistrationCountry')}</dt>
              <dd className="font-medium" data-testid="edit-registration-country">
                {flag === '' ? '' : `${flag} `}
                {formatCountryLabel(user.registrationCountryCode, locale)}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">{t('admin.detailLastOnline')}</dt>
              <dd className="font-medium">{formatAdminTimestamp(user.lastSeenAt, locale)}</dd>
            </div>
          </dl>

          {capability.reason === null ? null : (
            <p className="text-muted-foreground border-border rounded-md border border-dashed p-3 text-sm">
              {capability.reason === AdminUserCapabilityReason.SuperAdminSelf
                ? t('admin.editUserSelfSuperAdminNotice')
                : t('admin.editUserSuperAdminNotice')}
            </p>
          )}

          <DialogFooter className="gap-2 pt-2 sm:justify-between sm:gap-0">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="destructive"
                onClick={() => onRotatePassword(user.id)}
                disabled={isRotating || !capability.canRotatePassword}
              >
                {t('admin.editUserRotatePassword')}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => onSetPassword(user)}
                disabled={!capability.canSetPassword}
              >
                {t('admin.setPasswordAction')}
              </Button>
              {user.isBanned ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onUnban(user.id)}
                  disabled={isUnbanning || !capability.canBan}
                >
                  {t('admin.unbanAction')}
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => onBan(user)}
                  disabled={!capability.canBan}
                >
                  {t('admin.banAction')}
                </Button>
              )}
            </div>
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
