'use client';

import Link from 'next/link';
import { Controller } from 'react-hook-form';

import { PasswordRulesChecklist } from '@/components/auth/password-rules-checklist';
import { SignupFailureAlert } from '@/components/auth/signup-failure-alert';
import { PasswordInput } from '@/components/common/password-input';
import { PhoneInput } from '@/components/common/phone-input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ROUTES } from '@/constants';
import { useRegisterForm } from '@/hooks/auth/use-register-form';

// Field error messages are i18n keys (client schema and server field map
// alike), so every one is rendered through t().
export function RegisterForm(): React.ReactElement {
  const {
    form,
    onSubmit,
    isPending,
    failureCopy,
    requestId,
    copyRequestId,
    passwordRules,
    phoneServerErrorKey,
    signInHref,
    resetPasswordHref,
    t,
  } = useRegisterForm();
  const { errors } = form.formState;

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl">{t('auth.registerTitle')}</CardTitle>
        <CardDescription>{t('auth.registerSubtitle')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4"
          noValidate
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
              error={errors.firstName !== undefined}
              aria-describedby={errors.firstName ? 'firstName-error' : undefined}
              {...form.register('firstName')}
            />
            {errors.firstName?.message ? (
              <p id="firstName-error" className="text-destructive text-xs">
                {t(errors.firstName.message)}
              </p>
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
              error={errors.lastName !== undefined}
              aria-describedby={errors.lastName ? 'lastName-error' : undefined}
              {...form.register('lastName')}
            />
            {errors.lastName?.message ? (
              <p id="lastName-error" className="text-destructive text-xs">
                {t(errors.lastName.message)}
              </p>
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
              error={errors.email !== undefined}
              aria-describedby={errors.email ? 'email-error' : undefined}
              {...form.register('email')}
            />
            {errors.email?.message ? (
              <p id="email-error" className="text-destructive text-xs">
                {t(errors.email.message)}
              </p>
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
                  // The live format check while typing. The form's own phone
                  // error is not rendered as well, or the same problem would
                  // appear twice under the field.
                  invalidLabel={t('auth.signup.phoneInvalid')}
                  disabled={isPending}
                />
              )}
            />
            {phoneServerErrorKey ? (
              <p className="text-destructive text-xs">{t(phoneServerErrorKey)}</p>
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
              error={errors.password !== undefined}
              aria-describedby={
                errors.password ? 'password-error password-rules' : 'password-rules'
              }
              {...form.register('password')}
            />
            <PasswordRulesChecklist id="password-rules" rules={passwordRules} t={t} />
            {errors.password?.message ? (
              <p id="password-error" className="text-destructive text-xs">
                {t(errors.password.message)}
              </p>
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
              error={errors.confirmPassword !== undefined}
              aria-describedby={errors.confirmPassword ? 'confirmPassword-error' : undefined}
              {...form.register('confirmPassword')}
            />
            {errors.confirmPassword?.message ? (
              <p id="confirmPassword-error" className="text-destructive text-xs">
                {t(errors.confirmPassword.message)}
              </p>
            ) : null}
          </div>
          {failureCopy ? (
            <SignupFailureAlert
              copy={failureCopy}
              requestId={requestId}
              onCopyRequestId={copyRequestId}
              signInHref={signInHref}
              resetPasswordHref={resetPasswordHref}
              t={t}
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
