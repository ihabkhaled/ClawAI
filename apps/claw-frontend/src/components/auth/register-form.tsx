'use client';

import Link from 'next/link';
import { Controller } from 'react-hook-form';

import { PasswordInput } from '@/components/common/password-input';
import { PhoneInput } from '@/components/common/phone-input';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ROUTES } from '@/constants';
import { AlertVariant } from '@/enums/alert-variant.enum';
import { useRegisterForm } from '@/hooks/auth/use-register-form';

export function RegisterForm(): React.ReactElement {
  const { form, onSubmit, isPending, isError, errorMessage, t } = useRegisterForm();

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl">{t('auth.registerTitle')}</CardTitle>
        <CardDescription>{t('auth.registerSubtitle')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            void onSubmit(event);
          }}
        >
          <div className="space-y-2">
            <label htmlFor="firstName" className="text-sm leading-none font-medium">
              {t('auth.firstName')}
            </label>
            <Input
              id="firstName"
              autoComplete="given-name"
              placeholder={t('auth.firstNamePlaceholder')}
              disabled={isPending}
              {...form.register('firstName')}
            />
            {form.formState.errors.firstName ? (
              <p className="text-destructive text-xs">{form.formState.errors.firstName.message}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <label htmlFor="lastName" className="text-sm leading-none font-medium">
              {t('auth.lastName')}
            </label>
            <Input
              id="lastName"
              autoComplete="family-name"
              placeholder={t('auth.lastNamePlaceholder')}
              disabled={isPending}
              {...form.register('lastName')}
            />
            {form.formState.errors.lastName ? (
              <p className="text-destructive text-xs">{form.formState.errors.lastName.message}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm leading-none font-medium">
              {t('auth.email')}
            </label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder={t('auth.emailPlaceholder')}
              disabled={isPending}
              {...form.register('email')}
            />
            {form.formState.errors.email ? (
              <p className="text-destructive text-xs">{form.formState.errors.email.message}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <label htmlFor="phone" className="text-sm leading-none font-medium">
              {t('auth.phone')}{' '}
              <span className="text-muted-foreground">{t('auth.phoneOptional')}</span>
            </label>
            <Controller
              control={form.control}
              name="phone"
              render={({ field }) => (
                <PhoneInput
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  countryLabel={t('common.phoneCountryLabel')}
                  countrySearchLabel={t('common.phoneCountrySearch')}
                  numberLabel={t('common.phoneNumberLabel')}
                  numberPlaceholder={t('common.phoneNumberPlaceholder')}
                  invalidLabel={t('common.phoneInvalid')}
                  disabled={isPending}
                />
              )}
            />
            {form.formState.errors.phone ? (
              <p className="text-destructive text-xs">{form.formState.errors.phone.message}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm leading-none font-medium">
              {t('auth.password')}
            </label>
            <PasswordInput
              id="password"
              autoComplete="new-password"
              placeholder={t('auth.passwordPlaceholder')}
              disabled={isPending}
              {...form.register('password')}
            />
            {form.formState.errors.password ? (
              <p className="text-destructive text-xs">{form.formState.errors.password.message}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="text-sm leading-none font-medium">
              {t('auth.confirmPassword')}
            </label>
            <PasswordInput
              id="confirmPassword"
              autoComplete="new-password"
              disabled={isPending}
              {...form.register('confirmPassword')}
            />
            {form.formState.errors.confirmPassword ? (
              <p className="text-destructive text-xs">
                {form.formState.errors.confirmPassword.message}
              </p>
            ) : null}
          </div>
          {isError ? (
            <Alert
              variant={AlertVariant.Error}
              title={t('auth.registerFailed')}
              description={errorMessage ?? t('auth.registerFailed')}
            />
          ) : null}
          <Button type="submit" className="w-full" isLoading={isPending}>
            {isPending ? t('auth.registering') : t('auth.registerButton')}
          </Button>
        </form>
        <p className="text-muted-foreground mt-4 text-center text-sm">
          {t('auth.alreadyHaveAccount')}{' '}
          <Link href={ROUTES.LOGIN} className="text-primary font-medium hover:underline">
            {t('auth.signInLink')}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
