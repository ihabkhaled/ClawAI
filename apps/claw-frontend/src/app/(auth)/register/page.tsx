'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Zap } from 'lucide-react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';

import { AuthTopControls } from '@/components/auth/auth-top-controls';
import { AuthenticatedRedirectBoundary } from '@/components/auth/authenticated-redirect-boundary';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ROUTES } from '@/constants';
import { useRegister } from '@/hooks/auth/use-register';
import { useTranslation } from '@/lib/i18n';
import { registerSchema } from '@/lib/validation/register.schema';
import type { RegisterFormValues } from '@/lib/validation/register.schema';

export default function RegisterPage(): React.ReactElement {
  const { register, isPending, isError, error } = useRegister();
  const { t } = useTranslation();

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: '', password: '', confirmPassword: '' },
  });

  const onSubmit = (data: RegisterFormValues): void => {
    register({ email: data.email, password: data.password });
  };

  return (
    <AuthenticatedRedirectBoundary>
      <div className="bg-background relative flex min-h-dvh items-center justify-center px-4">
        <AuthTopControls />
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="bg-primary flex h-12 w-12 items-center justify-center rounded-xl">
              <Zap className="text-primary-foreground h-6 w-6" />
            </div>
            <h1 className="mt-4 text-2xl font-bold">{t('auth.welcomeTitle')}</h1>
            <p className="text-muted-foreground mt-1 text-sm">{t('auth.welcomeSubtitle')}</p>
          </div>

          <Card>
            <CardHeader className="space-y-1">
              <CardTitle className="text-xl">{t('auth.registerTitle')}</CardTitle>
              <CardDescription>{t('auth.registerSubtitle')}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                    <p className="text-destructive text-xs">
                      {form.formState.errors.email.message}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm leading-none font-medium">
                    {t('auth.password')}
                  </label>
                  <Input
                    id="password"
                    type="password"
                    placeholder={t('auth.passwordPlaceholder')}
                    autoComplete="new-password"
                    disabled={isPending}
                    {...form.register('password')}
                  />
                  {form.formState.errors.password ? (
                    <p className="text-destructive text-xs">
                      {form.formState.errors.password.message}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <label htmlFor="confirmPassword" className="text-sm leading-none font-medium">
                    {t('auth.confirmPassword')}
                  </label>
                  <Input
                    id="confirmPassword"
                    type="password"
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
                  <div className="bg-destructive/10 text-destructive rounded-md px-3 py-2 text-sm">
                    {error?.message ?? t('auth.registerFailed')}
                  </div>
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
        </div>
      </div>
    </AuthenticatedRedirectBoundary>
  );
}
