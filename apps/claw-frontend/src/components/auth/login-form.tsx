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

// Right-hand form column for the split login layout. On mobile (<lg) this
// component renders standalone — the branding panel is hidden by its own
// `hidden lg:flex` class so we don't need any duplicated state here.
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
      {/* Mobile-only logo + welcome — replaces the branding panel on small screens */}
      <div className="mb-6 flex flex-col items-center text-center lg:hidden">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
          <Zap className="h-6 w-6 text-primary-foreground" aria-hidden="true" />
        </div>
        <h1 className="mt-4 text-2xl font-bold">{t('auth.welcomeTitle')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('auth.welcomeSubtitle')}</p>
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
              <label htmlFor="email" className="text-sm font-medium leading-none">
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
                <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium leading-none">
                {t('auth.password')}
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder={t('auth.passwordPlaceholder')}
                  autoComplete="current-password"
                  disabled={isPending}
                  className="pe-10"
                  {...form.register('password')}
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  disabled={isPending}
                  aria-label={
                    showPassword ? t('auth.hidePasswordAria') : t('auth.showPasswordAria')
                  }
                  aria-pressed={showPassword}
                  className="absolute inset-y-0 end-0 flex items-center pe-3 text-muted-foreground transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </div>
              {form.formState.errors.password ? (
                <p className="text-xs text-destructive">
                  {form.formState.errors.password.message}
                </p>
              ) : null}
            </div>

            <div className="flex items-center justify-between">
              <label
                htmlFor="rememberMe"
                className="flex cursor-pointer select-none items-center gap-2 text-sm text-muted-foreground"
              >
                <Checkbox
                  id="rememberMe"
                  checked={rememberMe}
                  disabled={isPending}
                  onCheckedChange={(value) => {
                    handleRememberMeChange(value === true);
                  }}
                />
                <span>{t('auth.rememberMe')}</span>
              </label>
              <button
                type="button"
                onClick={handleForgotPasswordClick}
                disabled={isPending}
                className="text-sm font-medium text-primary hover:underline focus-visible:underline focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t('auth.forgotPassword')}
              </button>
            </div>

            {isError ? (
              <Alert
                variant={AlertVariant.Error}
                title={t('auth.loginFailedTitle')}
                description={errorMessage ?? t('auth.loginFailed')}
              />
            ) : null}

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? t('auth.signingIn') : t('auth.loginButton')}
            </Button>
          </form>
        </CardContent>
      </Card>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        {t('auth.noAccount')}{' '}
        <Link href={ROUTES.REGISTER} className="font-medium text-primary hover:underline">
          {t('auth.signUpLink')}
        </Link>
      </p>

      {/* Mobile-only tagline — desktop renders inside the branding panel */}
      <p className="mt-6 text-center text-xs text-muted-foreground lg:hidden">
        {t('auth.tagline')}
      </p>
    </div>
  );
}
