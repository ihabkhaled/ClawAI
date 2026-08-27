'use client';

import { RefreshCw } from 'lucide-react';
import { type ReactElement } from 'react';

import { PasswordStrengthMeter } from '@/components/common/password-strength-meter';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UserRole } from '@/enums';
import { useCreateUserForm } from '@/hooks/admin/use-create-user-form';
import type { CreateUserDialogProps } from '@/types/component.types';

export function CreateUserDialog(props: CreateUserDialogProps): ReactElement {
  const { open, isSaving, canCreateAdmin, onClose, onCreate, t } = props;
  const { form, strength, generate, submit } = useCreateUserForm(onCreate);
  const { errors, isValid } = form.formState;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('admin.createUserTitle')}</DialogTitle>
          <DialogDescription>{t('admin.createUserDescription')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="create-user-email" className="text-sm leading-none font-medium">
              {t('admin.createUserEmail')}
            </label>
            <Input
              id="create-user-email"
              type="email"
              autoComplete="off"
              error={Boolean(errors.email)}
              {...form.register('email')}
            />
            {errors.email ? (
              <p className="text-destructive text-xs">{t('admin.createUserEmailInvalid')}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label htmlFor="create-user-username" className="text-sm leading-none font-medium">
              {t('admin.createUserUsername')}
            </label>
            <Input
              id="create-user-username"
              autoComplete="off"
              error={Boolean(errors.username)}
              {...form.register('username')}
            />
            {errors.username ? (
              <p className="text-destructive text-xs">{t('admin.createUserUsernameInvalid')}</p>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="create-user-first-name" className="text-sm leading-none font-medium">
                {t('admin.createUserFirstName')}
              </label>
              <Input
                id="create-user-first-name"
                autoComplete="off"
                {...form.register('firstName')}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="create-user-last-name" className="text-sm leading-none font-medium">
                {t('admin.createUserLastName')}
              </label>
              <Input id="create-user-last-name" autoComplete="off" {...form.register('lastName')} />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="create-user-role" className="text-sm leading-none font-medium">
              {t('admin.createUserRole')}
            </label>
            <Select
              value={form.watch('role')}
              onValueChange={(value) =>
                form.setValue('role', value as UserRole, { shouldValidate: true })
              }
            >
              <SelectTrigger id="create-user-role" aria-label={t('admin.createUserRole')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UserRole.USER}>{t('admin.roleUser')}</SelectItem>
                <SelectItem value={UserRole.VIEWER}>{t('admin.roleViewer')}</SelectItem>
                <SelectItem value={UserRole.OPERATOR}>{t('admin.roleOperator')}</SelectItem>
                {canCreateAdmin ? (
                  <SelectItem value={UserRole.ADMIN}>{t('admin.roleAdmin')}</SelectItem>
                ) : null}
              </SelectContent>
            </Select>
            {canCreateAdmin ? null : (
              <p className="text-muted-foreground text-xs">
                {t('admin.createUserAdminRestricted')}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="create-user-password" className="text-sm leading-none font-medium">
                {t('admin.createUserPassword')}
              </label>
              <Button type="button" variant="outline" size="sm" onClick={generate}>
                <RefreshCw className="me-2 h-3.5 w-3.5" aria-hidden="true" />
                {t('admin.createUserGeneratePassword')}
              </Button>
            </div>
            <Input
              id="create-user-password"
              type="text"
              autoComplete="new-password"
              error={Boolean(errors.password)}
              {...form.register('password')}
            />
            <PasswordStrengthMeter strength={strength} />
            <p className="text-muted-foreground text-xs">{t('admin.createUserPasswordNotice')}</p>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              {t('admin.createUserCancel')}
            </Button>
            <Button type="submit" disabled={isSaving || !isValid}>
              {t('admin.createUserSubmit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
