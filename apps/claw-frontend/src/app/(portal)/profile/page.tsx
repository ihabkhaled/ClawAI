'use client';

import { Controller } from 'react-hook-form';

import { LoadingSpinner } from '@/components/common/loading-spinner';
import { PageHeader } from '@/components/common/page-header';
import { PasswordInput } from '@/components/common/password-input';
import { PhoneInput } from '@/components/common/phone-input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ComponentSize } from '@/enums';
import { useProfilePage } from '@/hooks/profile/use-profile-page';

export default function ProfilePage(): React.ReactElement {
  const { form, t, isLoading, isSaving, email, save } = useProfilePage();
  const { errors } = form.formState;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title={t('profile.title')} description={t('profile.description')} />
        <LoadingSpinner size={ComponentSize.LG} label={t('common.loading')} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t('profile.title')} description={t('profile.description')} />

      <Card>
        <CardHeader>
          <CardTitle>{t('profile.identityTitle')}</CardTitle>
          <CardDescription>{t('profile.identityDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={save} className="space-y-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="firstName" className="text-sm leading-none font-medium">
                  {t('profile.firstName')}
                </label>
                <Input id="firstName" autoComplete="given-name" {...form.register('firstName')} />
                {errors.firstName ? (
                  <p className="text-destructive text-xs">{t('profile.nameTooLong')}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <label htmlFor="lastName" className="text-sm leading-none font-medium">
                  {t('profile.lastName')}
                </label>
                <Input id="lastName" autoComplete="family-name" {...form.register('lastName')} />
                {errors.lastName ? (
                  <p className="text-destructive text-xs">{t('profile.nameTooLong')}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                {/* PhoneInput is a country button plus a number field, so there is
                    no single control to point a label at; each part carries its
                    own aria-label. */}
                <span className="text-sm leading-none font-medium">{t('profile.phone')}</span>
                <Controller
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <PhoneInput
                      value={field.value}
                      onChange={field.onChange}
                      countryLabel={t('common.phoneCountryLabel')}
                      countrySearchLabel={t('common.phoneCountrySearch')}
                      numberLabel={t('common.phoneNumberLabel')}
                      numberPlaceholder={t('common.phoneNumberPlaceholder')}
                      invalidLabel={t('common.phoneInvalid')}
                      disabled={isSaving}
                    />
                  )}
                />
                {errors.phone ? (
                  <p className="text-destructive text-xs">{t('profile.phoneInvalid')}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <label htmlFor="username" className="text-sm leading-none font-medium">
                  {t('profile.username')}
                </label>
                <Input id="username" autoComplete="username" {...form.register('username')} />
                {errors.username ? (
                  <p className="text-destructive text-xs">{t('profile.usernameInvalid')}</p>
                ) : null}
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-sm leading-none font-medium">{t('profile.email')}</span>
              <p className="text-muted-foreground text-sm">{email}</p>
              <p className="text-muted-foreground text-xs">{t('profile.emailNotice')}</p>
            </div>

            <div className="space-y-2">
              <label htmlFor="currentPassword" className="text-sm leading-none font-medium">
                {t('profile.currentPassword')}
              </label>
              <PasswordInput
                id="currentPassword"
                autoComplete="current-password"
                {...form.register('currentPassword')}
              />
              {errors.currentPassword ? (
                <p className="text-destructive text-xs">{t('profile.currentPasswordRequired')}</p>
              ) : null}
              <p className="text-muted-foreground text-xs">{t('profile.usernameNotice')}</p>
            </div>

            <Button type="submit" disabled={isSaving}>
              {isSaving ? t('common.loading') : t('profile.save')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
