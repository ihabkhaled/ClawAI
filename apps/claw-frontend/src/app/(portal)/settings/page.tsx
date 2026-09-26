'use client';

import { LoadingSpinner } from '@/components/common/loading-spinner';
import { PageHeader } from '@/components/common/page-header';
import { PasswordInput } from '@/components/common/password-input';
import { ChangePasswordCard } from '@/components/settings/change-password-card';
import { CurrencyPreferenceCard } from '@/components/settings/currency-preference-card';
import { EmailChangeCard } from '@/components/settings/email-change-card';
import { TtsVoicePreferenceCard } from '@/components/settings/tts-voice-preference-card';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
    isLoading,
    isPending,
    currentLanguage,
    currentAppearance,
    handleLanguageChange,
    handleAppearanceChange,
    activeCurrency,
    isCurrencyAutomatic,
    detectedCountry,
    currentTtsVoice,
    handleTtsVoiceChange,
    passwordForm,
    handlePasswordSubmit,
    isPasswordPending,
    deleteForm,
    deleteAccount,
    isDeletePending,
    emailChange,
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
        <EmailChangeCard
          pendingState={emailChange.pendingState}
          requestForm={emailChange.requestForm}
          otpForm={emailChange.otpForm}
          onSubmitRequest={emailChange.submitRequest}
          onSubmitOtp={emailChange.submitOtp}
          onResendOtp={emailChange.resendOtp}
          onCancelChange={emailChange.cancelChange}
          resendCooldownSeconds={emailChange.resendCooldownSeconds}
          t={emailChange.t}
          isLoading={emailChange.loading}
          isRequesting={emailChange.isRequesting}
          isVerifying={emailChange.isVerifying}
          isResending={emailChange.isResending}
          isCancelling={emailChange.isCancelling}
        />

        <Separator />

        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle className="text-lg">{t('settings.deleteAccount')}</CardTitle>
            <CardDescription>{t('settings.deleteAccountDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={deleteAccount} className="max-w-sm space-y-4">
              <div className="space-y-2">
                <label htmlFor="delete-current-password" className="text-sm font-medium">
                  {t('settings.currentPassword')}
                </label>
                <PasswordInput
                  id="delete-current-password"
                  autoComplete="current-password"
                  disabled={isDeletePending}
                  {...deleteForm.register('currentPassword')}
                />
              </div>
              <Button type="submit" variant="destructive" disabled={isDeletePending}>
                {isDeletePending ? t('common.loading') : t('settings.deleteAccount')}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Separator />

        <ChangePasswordCard
          form={passwordForm}
          onSubmit={handlePasswordSubmit}
          isPending={isPasswordPending}
          t={t}
        />

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
                <SelectValue placeholder={t('settings.selectLanguage')} />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.nativeLabel} ({t(option.label)})
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
            <div className="flex flex-wrap gap-2">
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
                    {t(option.label)}
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Separator />

        <CurrencyPreferenceCard
          activeCurrency={activeCurrency}
          isAutomatic={isCurrencyAutomatic}
          detectedCountry={detectedCountry}
        />

        <Separator />

        <TtsVoicePreferenceCard
          value={currentTtsVoice}
          isPending={isPending}
          onChange={handleTtsVoiceChange}
        />
      </div>
    </div>
  );
}
