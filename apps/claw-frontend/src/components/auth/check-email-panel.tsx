'use client';

import { MailCheck, RefreshCw, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ROUTES } from '@/constants';
import {
  CHECK_EMAIL_STEPS,
  CHECK_EMAIL_TROUBLESHOOTING_KEYS,
} from '@/constants/auth-onboarding.constants';
import { useCheckEmailPage } from '@/hooks/auth/use-check-email-page';

/**
 * The screen a brand-new account lands on.
 *
 * Registration used to bounce straight to the sign-in form with a green toast,
 * which read as "you're done" — and then the sign-in attempt failed, with no
 * explanation, because the address was not confirmed yet. This screen exists to
 * say the one thing that matters out loud: you cannot sign in until you confirm
 * your address, and here is exactly how.
 *
 * It is deliberately wordier than a success screen. Every line answers a
 * question a stuck user would otherwise have to guess at: where the email went,
 * what to do if it did not arrive, and what happens after.
 */
export function CheckEmailPanel(): React.ReactElement {
  const {
    email,
    hasAddress,
    loginHref,
    resend,
    isResending,
    hasResent,
    cooldownSeconds,
    resendLabel,
    t,
  } = useCheckEmailPage();

  return (
    <Card className="mx-auto w-full max-w-lg">
      <CardHeader className="items-center gap-3 text-center sm:items-start sm:text-start">
        <span
          aria-hidden="true"
          className="bg-primary/10 text-primary mx-auto flex h-14 w-14 items-center justify-center rounded-2xl sm:mx-0"
        >
          <MailCheck className="h-7 w-7" />
        </span>
        <CardTitle className="text-xl sm:text-2xl">{t('auth.checkEmailTitle')}</CardTitle>
        <CardDescription className="text-pretty">
          {hasAddress ? t('auth.checkEmailSubtitle') : t('auth.checkEmailSubtitleNoAddress')}
        </CardDescription>
        {hasAddress ? (
          <p
            dir="ltr"
            className="bg-muted/60 text-foreground w-full rounded-lg px-3 py-2 text-center text-sm font-medium break-all sm:text-start"
          >
            {email}
          </p>
        ) : null}
      </CardHeader>

      <CardContent className="space-y-6">
        {/* The blocking fact, stated once, unmissably. Everything else on this
            page is detail; this is the reason the page exists at all. */}
        <div className="border-warning/40 bg-warning/10 flex gap-3 rounded-xl border p-3 sm:p-4">
          <ShieldCheck aria-hidden="true" className="text-warning mt-0.5 h-5 w-5 shrink-0" />
          <div className="space-y-1">
            <p className="text-sm font-semibold">{t('auth.checkEmailBlockedTitle')}</p>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {t('auth.checkEmailBlockedBody')}
            </p>
          </div>
        </div>

        <ol className="space-y-4">
          {CHECK_EMAIL_STEPS.map((step, index) => (
            <li key={step.titleKey} className="flex gap-3">
              <span
                aria-hidden="true"
                className="bg-primary/10 text-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
              >
                {index + 1}
              </span>
              <div className="space-y-0.5">
                <p className="text-sm font-medium">{t(step.titleKey)}</p>
                <p className="text-muted-foreground text-sm leading-relaxed">{t(step.bodyKey)}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="border-border/60 space-y-3 rounded-xl border p-3 sm:p-4">
          <p className="text-sm font-semibold">{t('auth.checkEmailNotArrivedTitle')}</p>
          <ul className="text-muted-foreground list-disc space-y-1 ps-5 text-sm leading-relaxed">
            {CHECK_EMAIL_TROUBLESHOOTING_KEYS.map((key) => (
              <li key={key}>{t(key)}</li>
            ))}
          </ul>
          {hasAddress ? (
            <Button
              type="button"
              variant="outline"
              onClick={resend}
              isLoading={isResending}
              // Disabled while the server's cooldown is still running. This is
              // a courtesy, not the rate limit: the limit lives in the backend,
              // which refuses a second send for the same address regardless of
              // what this tab believes.
              disabled={isResending || cooldownSeconds > 0}
              // The button base has no gap of its own, so an icon+label button
              // has to ask for one or the two run together.
              className="w-full gap-2"
            >
              {/* The loading state renders its own spinner; a second spinning
                  icon beside it reads as a glitch. */}
              {isResending ? null : <RefreshCw aria-hidden="true" className="h-4 w-4" />}
              {resendLabel}
            </Button>
          ) : null}
          {hasResent ? (
            <p className="text-muted-foreground text-xs" aria-live="polite">
              {t('auth.checkEmailResendHint')}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button asChild className="w-full sm:flex-1">
            <Link href={loginHref}>{t('auth.checkEmailGoToLogin')}</Link>
          </Button>
          <Button asChild variant="ghost" className="w-full sm:flex-1">
            <Link href={ROUTES.REGISTER}>{t('auth.checkEmailWrongAddress')}</Link>
          </Button>
        </div>

        <p className="text-muted-foreground text-center text-xs leading-relaxed">
          {t('auth.checkEmailFooterNote')}
        </p>
      </CardContent>
    </Card>
  );
}
