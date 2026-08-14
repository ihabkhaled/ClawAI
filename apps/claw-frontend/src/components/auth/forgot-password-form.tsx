'use client';

import Link from 'next/link';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ROUTES } from '@/constants';
import { AlertVariant } from '@/enums/alert-variant.enum';
import { useForgotPasswordForm } from '@/hooks/auth/use-forgot-password-form';

export function ForgotPasswordForm(): React.ReactElement {
  const { form, onSubmit, isPending, isSuccess, errorMessage, t } = useForgotPasswordForm();

  if (isSuccess) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('auth.forgotPasswordSuccessTitle')}</CardTitle>
          <CardDescription>{t('auth.forgotPasswordSuccessDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href={ROUTES.LOGIN} className="text-primary text-sm font-medium hover:underline">
            {t('auth.forgotPasswordBackToLogin')}
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle>{t('auth.forgotPasswordTitle')}</CardTitle>
        <CardDescription>{t('auth.forgotPasswordDescription')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="forgot-password-email" className="text-sm leading-none font-medium">
              {t('auth.forgotPasswordEmailLabel')}
            </label>
            <Input
              id="forgot-password-email"
              type="email"
              autoComplete="email"
              placeholder={t('auth.forgotPasswordEmailPlaceholder')}
              {...form.register('email')}
            />
            {form.formState.errors.email && (
              <p role="alert" className="text-destructive text-sm">
                {form.formState.errors.email.message}
              </p>
            )}
          </div>
          {errorMessage && (
            <Alert
              variant={AlertVariant.Error}
              title={t('auth.forgotPasswordErrorTitle')}
              description={errorMessage}
            />
          )}
          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? t('auth.forgotPasswordSubmitting') : t('auth.forgotPasswordSubmit')}
          </Button>
          <div className="text-center">
            <Link href={ROUTES.LOGIN} className="text-muted-foreground hover:text-primary text-sm">
              {t('auth.forgotPasswordBackToLogin')}
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
