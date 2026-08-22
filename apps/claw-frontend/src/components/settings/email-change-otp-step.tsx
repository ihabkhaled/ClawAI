'use client';

import type { ReactElement } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { EmailChangeOtpStepProps } from '@/types/component.types';

export function EmailChangeOtpStep({
  otpForm,
  onSubmitOtp,
  onResendOtp,
  onCancelChange,
  resendCooldownSeconds,
  t,
  isVerifying,
  isResending,
  isCancelling,
}: EmailChangeOtpStepProps): ReactElement {
  const otpError = otpForm.formState.errors.otp;

  return (
    <form onSubmit={onSubmitOtp} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="email-change-otp" className="text-sm leading-none font-medium">
          {t('settings.emailChange.otpLabel')}
        </label>
        <Input
          id="email-change-otp"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          aria-invalid={Boolean(otpError)}
          aria-describedby={otpError ? 'email-change-otp-error' : undefined}
          disabled={isVerifying}
          {...otpForm.register('otp')}
        />
        {otpError ? (
          <p id="email-change-otp-error" role="alert" className="text-destructive text-sm">
            {otpError.message}
          </p>
        ) : null}
      </div>
      <Button type="submit" isLoading={isVerifying} className="w-full">
        {t('settings.emailChange.verify')}
      </Button>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onResendOtp}
          disabled={isResending || resendCooldownSeconds > 0}
          aria-live="polite"
        >
          {resendCooldownSeconds > 0
            ? t('settings.emailChange.resendCooldown', { seconds: resendCooldownSeconds })
            : t('settings.emailChange.resend')}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancelChange}
          disabled={isCancelling || isVerifying}
        >
          {t('settings.emailChange.cancel')}
        </Button>
      </div>
    </form>
  );
}
