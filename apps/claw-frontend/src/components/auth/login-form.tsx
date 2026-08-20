'use client';

import { Eye, EyeOff, Zap } from 'lucide-react';
import Link from 'next/link';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { ROUTES } from '@/constants';
import { AlertVariant } from '@/enums/alert-variant.enum';
import { useLoginForm } from '@/hooks/auth/use-login-form';

export function LoginForm(): React.ReactElement {
  const {
    form,
    showPassword,
    togglePasswordVisibility,
    rememberMe,
    handleRememberMeChange,
    handleForgotPasswordClick,
    onSubmit,
    isPending,
    isError,
    errorMessage,
    t,
  } = useLoginForm();

  return (
    <div className="flex w-full max-w-sm flex-col">
      <div className="mb-6 flex flex-col items-center text-center lg:hidden">
        <div className="bg-primary flex h-12 w-12 items-center justify-center rounded-xl">
          <Zap className="text-primary-foreground h-6 w-6" aria-hidden="true" />
        </div>
        <h1 className="mt-4 text-2xl font-bold">{t('auth.welcomeTitle')}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{t('auth.welcomeSubtitle')}</p>
      </div>

      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-xl">{t('auth.loginTitle')}</CardTitle>
          <CardDescription>{t('auth.loginSubtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(event) => {
              void onSubmit(event);
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm leading-none font-medium">
                {t('auth.email')}
              </label>
              <Input
                id="email"
                type="email"
                placeholder={t('auth.emailPlaceholder')}
                autoComplete="email"
                disabled={isPending}
                {...form.register('email')}
              />
              {form.formState.errors.email ? (
                <p className="text-destructive text-xs">{form.formState.errors.email.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm leading-none font-medium">
                {t('auth.password')}
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder={t('auth.passwordPlaceholder')}
                  autoComplete="current-password"
                  disabled={isPending}
                  className="pe-12"
                  {...form.register('password')}
                />
                <Button
                  variant="unstyled"
                  size="unstyled"
                  type="button"
                  onClick={togglePasswordVisibility}
                  disabled={isPending}
                  aria-label={showPassword ? t('auth.hidePasswordAria') : t('auth.showPasswordAria')}
                  aria-pressed={showPassword}
                  className="text-muted-foreground hover:text-foreground focus-visible:text-foreground absolute inset-y-0 end-0 flex min-h-11 min-w-11 items-center justify-center transition-colors focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                </Button>
              </div>
              {form.formState.errors.password ? (
                <p className="text-destructive text-xs">{form.formState.errors.password.message}</p>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 max-[360px]:items-stretch">
              <label
                htmlFor="rememberMe"
                className="text-muted-foreground flex min-h-11 cursor-pointer items-center gap-2 text-sm select-none"
              >
                <Checkbox
                  id="rememberMe"
                  checked={rememberMe}
                  disabled={isPending}
                  onCheckedChange={(value) => handleRememberMeChange(value === true)}
                />
                <span>{t('auth.rememberMe')}</span>
              </label>
              <Button
                variant="unstyled"
                size="unstyled"
                type="button"
                onClick={handleForgotPasswordClick}
                disabled={isPending}
                className="text-primary flex min-h-11 items-center px-2 text-sm font-medium hover:underline focus-visible:underline focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t('auth.forgotPassword')}
              </Button>
            </div>

            {isError ? (
              <Alert variant={AlertVariant.Error} title={t('auth.loginFailedTitle')} description={errorMessage ?? t('auth.loginFailed')} />
            ) : null}

            <Button type="submit" className="w-full" isLoading={isPending}>
              {isPending ? t('auth.signingIn') : t('auth.loginButton')}
            </Button>
          </form>
        </CardContent>
      </Card>

      <p className="text-muted-foreground mt-4 text-center text-sm">
        {t('auth.noAccount')}{' '}
        <Link href={ROUTES.REGISTER} className="text-primary inline-flex min-h-11 items-center px-1 font-medium hover:underline">
          {t('auth.signUpLink')}
        </Link>
      </p>

      <p className="text-muted-foreground mt-6 text-center text-xs lg:hidden">{t('auth.tagline')}</p>
    </div>
  );
}
