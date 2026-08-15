'use client';

import Link from 'next/link';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ROUTES } from '@/constants';
import { AlertVariant } from '@/enums/alert-variant.enum';
import { useResetPasswordForm } from '@/hooks/auth/use-reset-password-form';

export function ResetPasswordForm(): React.ReactElement {
  const { form, onSubmit, isPending, isSuccess, isError, isInvalidToken, errorMessage, t } =
    useResetPasswordForm();

  if (isInvalidToken) {
    return (
      <Card className="mx-auto w-full max-w-md">
        <CardHeader>
          <CardTitle>{t('auth.resetPasswordInvalidTokenTitle')}</CardTitle>
          <CardDescription>{t('auth.resetPasswordInvalidTokenDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <Link href={ROUTES.FORGOT_PASSWORD}>{t('auth.resetPasswordRequestNewLink')}</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isSuccess) {
    return (
      <Card className="mx-auto w-full max-w-md">
        <CardHeader>
          <CardTitle>{t('auth.resetPasswordSuccessTitle')}</CardTitle>
          <CardDescription>{t('auth.resetPasswordSuccessDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <Link href={ROUTES.LOGIN}>{t('auth.resetPasswordBackToLogin')}</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle>{t('auth.resetPasswordTitle')}</CardTitle>
        <CardDescription>{t('auth.resetPasswordDescription')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              {t('auth.resetPasswordNewPasswordLabel')}
            </label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              {...form.register('password')}
              aria-invalid={!!form.formState.errors.password}
            />
            {form.formState.errors.password && (
              <p role="alert" className="text-destructive text-sm">
                {form.formState.errors.password.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="text-sm font-medium">
              {t('auth.resetPasswordConfirmPasswordLabel')}
            </label>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              {...form.register('confirmPassword')}
              aria-invalid={!!form.formState.errors.confirmPassword}
            />
            {form.formState.errors.confirmPassword && (
              <p role="alert" className="text-destructive text-sm">
                {form.formState.errors.confirmPassword.message}
              </p>
            )}
          </div>
          {isError && errorMessage && (
            <Alert
              variant={AlertVariant.Error}
              title={t('auth.resetPasswordErrorTitle')}
              description={errorMessage}
            />
          )}
          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? t('auth.resetPasswordSubmitting') : t('auth.resetPasswordSubmit')}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
