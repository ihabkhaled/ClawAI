'use client';

import type { ReactElement } from 'react';

import { LoadingSpinner } from '@/components/common/loading-spinner';
import { EmailChangeOtpStep } from '@/components/settings/email-change-otp-step';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { EmailChangeStage } from '@/enums/email-change-stage.enum';
import type { EmailChangeCardProps } from '@/types/component.types';

export function EmailChangeCard({
  pendingState,
  requestForm,
  otpForm,
  onSubmitRequest,
  onSubmitOtp,
  onResendOtp,
  onCancelChange,
  resendCooldownSeconds,
  t,
  isLoading,
  isRequesting,
  isVerifying,
  isResending,
  isCancelling,
}: EmailChangeCardProps): ReactElement {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('settings.emailChange.title')}</CardTitle>
          <CardDescription>{t('settings.emailChange.description')}</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-10">
          <LoadingSpinner />
        </CardContent>
      </Card>
    );
  }

  if (pendingState?.stage === EmailChangeStage.OldEmailPending) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('settings.emailChange.title')}</CardTitle>
          <CardDescription>{t('settings.emailChange.otpDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <EmailChangeOtpStep
            pendingState={pendingState}
            otpForm={otpForm}
            onSubmitOtp={onSubmitOtp}
            onResendOtp={onResendOtp}
            onCancelChange={onCancelChange}
            resendCooldownSeconds={resendCooldownSeconds}
            t={t}
            isVerifying={isVerifying}
            isResending={isResending}
            isCancelling={isCancelling}
          />
        </CardContent>
      </Card>
    );
  }

  if (pendingState?.stage === EmailChangeStage.NewEmailPending) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('settings.emailChange.title')}</CardTitle>
          <CardDescription>{t('settings.emailChange.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <p role="status" aria-live="polite" className="text-muted-foreground text-sm">
            {t('settings.emailChange.pendingNotice', { email: pendingState.maskedNewEmail })}
          </p>
        </CardContent>
        <CardFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onCancelChange}
            disabled={isCancelling}
            isLoading={isCancelling}
          >
            {t('settings.emailChange.cancel')}
          </Button>
        </CardFooter>
      </Card>
    );
  }

  const passwordError = requestForm.formState.errors.currentPassword;
  const emailError = requestForm.formState.errors.newEmail;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('settings.emailChange.title')}</CardTitle>
        <CardDescription>{t('settings.emailChange.description')}</CardDescription>
      </CardHeader>
      <form onSubmit={onSubmitRequest}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="email-change-current-password"
              className="text-sm leading-none font-medium"
            >
              {t('settings.emailChange.currentPasswordLabel')}
            </label>
            <Input
              id="email-change-current-password"
              type="password"
              autoComplete="current-password"
              aria-invalid={Boolean(passwordError)}
              aria-describedby={passwordError ? 'email-change-current-password-error' : undefined}
              disabled={isRequesting}
              {...requestForm.register('currentPassword')}
            />
            {passwordError ? (
              <p
                id="email-change-current-password-error"
                role="alert"
                className="text-destructive text-sm"
              >
                {passwordError.message}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <label htmlFor="email-change-new-email" className="text-sm leading-none font-medium">
              {t('settings.emailChange.newEmailLabel')}
            </label>
            <Input
              id="email-change-new-email"
              type="email"
              autoComplete="email"
              aria-invalid={Boolean(emailError)}
              aria-describedby={emailError ? 'email-change-new-email-error' : undefined}
              disabled={isRequesting}
              {...requestForm.register('newEmail')}
            />
            {emailError ? (
              <p
                id="email-change-new-email-error"
                role="alert"
                className="text-destructive text-sm"
              >
                {emailError.message}
              </p>
            ) : null}
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" isLoading={isRequesting} className="w-full">
            {t('settings.emailChange.submit')}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
