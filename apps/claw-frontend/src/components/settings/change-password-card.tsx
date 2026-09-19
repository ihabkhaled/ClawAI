'use client';

import type { ReactElement } from 'react';

import { PasswordInput } from '@/components/common/password-input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { ChangePasswordCardProps } from '@/types/component.types';

export function ChangePasswordCard({
  form,
  onSubmit,
  isPending,
  t,
}: ChangePasswordCardProps): ReactElement {
  const { errors } = form.formState;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t('settings.changePassword')}</CardTitle>
        <CardDescription>{t('settings.passwordRequirements')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-sm space-y-4">
          <div className="space-y-2">
            <label htmlFor="current-password" className="text-sm font-medium">
              {t('settings.currentPassword')}
            </label>
            <PasswordInput
              id="current-password"
              autoComplete="current-password"
              disabled={isPending}
              {...form.register('currentPassword')}
            />
            {errors.currentPassword ? (
              <p className="text-destructive text-xs">{errors.currentPassword.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label htmlFor="new-password" className="text-sm font-medium">
              {t('settings.newPassword')}
            </label>
            <PasswordInput
              id="new-password"
              autoComplete="new-password"
              disabled={isPending}
              {...form.register('newPassword')}
            />
            {errors.newPassword ? (
              <p className="text-destructive text-xs">{errors.newPassword.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label htmlFor="confirm-password" className="text-sm font-medium">
              {t('settings.confirmPassword')}
            </label>
            <PasswordInput
              id="confirm-password"
              autoComplete="new-password"
              disabled={isPending}
              {...form.register('confirmPassword')}
            />
            {errors.confirmPassword ? (
              <p className="text-destructive text-xs">{errors.confirmPassword.message}</p>
            ) : null}
          </div>

          <Button type="submit" disabled={isPending}>
            {isPending ? t('common.loading') : t('settings.changePassword')}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
