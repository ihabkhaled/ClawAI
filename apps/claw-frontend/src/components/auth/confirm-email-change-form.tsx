'use client';

import Link from 'next/link';
import type { ReactElement } from 'react';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ROUTES } from '@/constants';
import { AlertVariant } from '@/enums/alert-variant.enum';
import { useConfirmEmailChangeForm } from '@/hooks/auth/use-confirm-email-change-form';

export function ConfirmEmailChangeForm(): ReactElement {
  const { t, onSubmit, isPending, isSuccess, isError, isInvalidToken, errorMessage } =
    useConfirmEmailChangeForm();

  if (isInvalidToken) {
    return (
      <Card className="mx-auto w-full max-w-md">
        <CardHeader>
          <CardTitle>{t('auth.confirmEmailChangeTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p>{t('auth.confirmEmailChangeInvalidToken')}</p>
          <Button asChild className="w-full">
            <Link href={ROUTES.LOGIN}>{t('auth.confirmEmailChangeBackToLogin')}</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isSuccess) {
    return (
      <Card className="mx-auto w-full max-w-md">
        <CardHeader>
          <CardTitle>{t('auth.confirmEmailChangeTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p>{t('auth.confirmEmailChangeSuccess')}</p>
          <Button asChild className="w-full">
            <Link href={ROUTES.LOGIN}>{t('auth.confirmEmailChangeBackToLogin')}</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle>{t('auth.confirmEmailChangeTitle')}</CardTitle>
        <CardDescription>{t('auth.confirmEmailChangeDescription')}</CardDescription>
      </CardHeader>
      <CardContent>
        {isError && errorMessage ? (
          <Alert
            variant={AlertVariant.Error}
            title={t('auth.confirmEmailChangeDescription')}
            description={errorMessage}
          />
        ) : null}
        <form onSubmit={onSubmit}>
          <Button type="submit" className="w-full" disabled={isPending}>
            {t('auth.confirmEmailChangeTitle')}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
