'use client';

import { CircleAlert, CircleCheckBig, Info, Loader2 } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ROUTES } from '@/constants';
import { EMAIL_VERIFICATION_TONE_BADGE_CLASS } from '@/constants/email-verification-tone.constants';
import { EmailVerificationOutcome, EmailVerificationTone } from '@/enums';
import { useVerifyEmailPage } from '@/hooks/auth/use-verify-email-page';
import { cn } from '@/lib/utils';
import {
  resolveEmailVerificationPanelCopy,
  resolveEmailVerificationTone,
} from '@/utilities/email-verification-copy.utility';

/**
 * What a user sees after clicking the link in their confirmation email.
 *
 * This page was previously a bare `<section>` with a heading, one sentence and
 * a "Sign in" button — no card, no branding, and no way out of the one state
 * that needs one: an expired link told the reader to "request a new one"
 * without offering anywhere to do it.
 *
 * Every outcome now says three things: what happened, what it means, and what
 * to do next. The two non-success outcomes carry a second route out, because
 * the primary button (sign in) is exactly what will not work for them.
 */
export function VerifyEmailPanel(): React.ReactElement {
  const { outcome, t } = useVerifyEmailPage();
  const copy = resolveEmailVerificationPanelCopy(outcome);
  const tone = resolveEmailVerificationTone(outcome);
  const isPending = outcome === EmailVerificationOutcome.Pending;
  const isFailure = outcome === EmailVerificationOutcome.Failed;

  return (
    <Card className="mx-auto w-full max-w-lg">
      <CardHeader className="items-center gap-3 text-center">
        <span
          aria-hidden="true"
          className={cn(
            'mx-auto flex h-14 w-14 items-center justify-center rounded-2xl',
            EMAIL_VERIFICATION_TONE_BADGE_CLASS[tone],
          )}
        >
          {tone === EmailVerificationTone.Pending ? (
            <Loader2 className="h-7 w-7 animate-spin" />
          ) : null}
          {tone === EmailVerificationTone.Success ? <CircleCheckBig className="h-7 w-7" /> : null}
          {tone === EmailVerificationTone.Neutral ? <Info className="h-7 w-7" /> : null}
          {tone === EmailVerificationTone.Failure ? <CircleAlert className="h-7 w-7" /> : null}
        </span>
        <CardTitle className="text-xl sm:text-2xl">{t(copy.titleKey)}</CardTitle>
        <CardDescription className="text-pretty">{t(copy.bodyKey)}</CardDescription>
      </CardHeader>

      {/* The spinner state is a genuine wait, not a result: it keeps the same
          card so the page does not jump when the answer arrives, but offers no
          actions, because there is nothing yet to act on. */}
      <CardContent className="space-y-5" aria-live="polite" aria-busy={isPending}>
        <p className="bg-muted/50 text-muted-foreground rounded-xl p-3 text-sm leading-relaxed sm:p-4">
          {t(copy.detailKey)}
        </p>

        {isPending ? null : (
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button asChild className="w-full sm:flex-1">
              <Link href={ROUTES.LOGIN}>{t(copy.primaryActionKey)}</Link>
            </Button>
            {copy.secondaryActionKey === null ? null : (
              <Button asChild variant="outline" className="w-full sm:flex-1">
                {/* A dead link needs a new account or a new registration; a
                    used one usually needs a password, not a new account. */}
                <Link href={isFailure ? ROUTES.REGISTER : ROUTES.FORGOT_PASSWORD}>
                  {t(copy.secondaryActionKey)}
                </Link>
              </Button>
            )}
          </div>
        )}

        {tone === EmailVerificationTone.Success ? (
          <p className="text-muted-foreground text-center text-xs leading-relaxed">
            {t('auth.verifyEmailVerifiedFooter')}
          </p>
        ) : null}

        {isFailure ? (
          <p className="text-muted-foreground text-center text-xs leading-relaxed">
            {t('auth.verifyEmailFailedFooter')}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
