'use client';

import { LoadingSpinner } from '@/components/common/loading-spinner';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { LANGUAGE_OPTIONS, APPEARANCE_OPTIONS, APPEARANCE_ICONS } from '@/constants';
import { ComponentSize } from '@/enums';
import type { UserLanguagePreference } from '@/enums';
import { useSettingsPage } from '@/hooks/settings/use-settings-page';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export default function SettingsPage() {
  const {
    user,
    isLoading,
    isPending,
    currentLanguage,
    currentAppearance,
    handleLanguageChange,
    handleAppearanceChange,
    passwordForm,
    handlePasswordSubmit,
    isPasswordPending,
  } = useSettingsPage();
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div>
        <PageHeader title={t('settings.title')} description={t('settings.description')} />
        <LoadingSpinner size={ComponentSize.LG} label={t('common.loading')} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title={t('settings.title')} description={t('settings.description')} />

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('settings.profile')}</CardTitle>
            <CardDescription>
              Your personal information. These fields are read-only.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="settings-username" className="text-sm font-medium">
                Username
              </label>
              <Input id="settings-username" value={user?.username ?? ''} disabled readOnly />
            </div>
            <div className="space-y-2">
              <label htmlFor="settings-email" className="text-sm font-medium">
                Email
              </label>
              <Input id="settings-email" value={user?.email ?? ''} disabled readOnly />
              <p className="text-xs text-muted-foreground">
                Contact an administrator to change your email.
              </p>
            </div>
            <div className="space-y-2">
              <label htmlFor="settings-role" className="text-sm font-medium">
                Role
              </label>
              <Input id="settings-role" value={user?.role ?? ''} disabled readOnly />
            </div>
          </CardContent>
        </Card>

        <Separator />

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('settings.changePassword')}</CardTitle>
            <CardDescription>
              Update your account password. Must be at least 8 characters with an uppercase letter,
              lowercase letter, and number.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)}
              className="space-y-4 max-w-sm"
            >
              <div className="space-y-2">
                <label htmlFor="current-password" className="text-sm font-medium">
                  {t('settings.currentPassword')}
                </label>
                <Input
                  id="current-password"
                  type="password"
                  autoComplete="current-password"
                  disabled={isPasswordPending}
                  {...passwordForm.register('currentPassword')}
                />
                {passwordForm.formState.errors.currentPassword ? (
                  <p className="text-xs text-destructive">
                    {passwordForm.formState.errors.currentPassword.message}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <label htmlFor="new-password" className="text-sm font-medium">
                  {t('settings.newPassword')}
                </label>
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  disabled={isPasswordPending}
                  {...passwordForm.register('newPassword')}
                />
                {passwordForm.formState.errors.newPassword ? (
                  <p className="text-xs text-destructive">
                    {passwordForm.formState.errors.newPassword.message}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <label htmlFor="confirm-password" className="text-sm font-medium">
                  {t('settings.confirmPassword')}
                </label>
                <Input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  disabled={isPasswordPending}
                  {...passwordForm.register('confirmPassword')}
                />
                {passwordForm.formState.errors.confirmPassword ? (
                  <p className="text-xs text-destructive">
                    {passwordForm.formState.errors.confirmPassword.message}
                  </p>
                ) : null}
              </div>

              <Button type="submit" disabled={isPasswordPending}>
                {isPasswordPending ? t('common.loading') : t('settings.changePassword')}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Separator />

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('settings.language')}</CardTitle>
            <CardDescription>{t('settings.languageDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Select
              value={currentLanguage}
              onValueChange={(value: string) =>
                handleLanguageChange(value as UserLanguagePreference)
              }
              disabled={isPending}
            >
              <SelectTrigger className="w-full max-w-xs">
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.nativeLabel} ({option.label})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Separator />

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('settings.appearance')}</CardTitle>
            <CardDescription>{t('settings.appearanceDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              {APPEARANCE_OPTIONS.map((option) => {
                const IconComponent =
                  APPEARANCE_ICONS[option.icon as keyof typeof APPEARANCE_ICONS];
                const isActive = currentAppearance === option.value;

                return (
                  <Button
                    key={option.value}
                    variant={isActive ? 'default' : 'outline'}
                    size="sm"
                    disabled={isPending}
                    onClick={() => handleAppearanceChange(option.value)}
                    className={cn('gap-2', isActive && 'pointer-events-none')}
                  >
                    {IconComponent ? <IconComponent className="h-4 w-4" /> : null}
                    {option.label}
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
