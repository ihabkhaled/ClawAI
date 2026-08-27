'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { EmailVerificationOutcome } from '@/enums/email-verification-outcome.enum';
import { authRepository } from '@/repositories/auth/auth.repository';
import type { UseVerifyEmailPageReturn } from '@/types';

/**
 * Resolves what a verification link actually did, instead of redirecting either way.
 *
 * The old behaviour called the endpoint, ignored its answer, and replaced the
 * route with the login screen in a `finally` — so a successful verification, an
 * expired link, and a token an administrator had already burned all produced the
 * same blank bounce. The endpoint has always returned `{ verified }`; nothing
 * read it.
 */
export function useVerifyEmailPage(): UseVerifyEmailPageReturn {
  const searchParams = useSearchParams();
  const [outcome, setOutcome] = useState<EmailVerificationOutcome>(
    EmailVerificationOutcome.Pending,
  );

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setOutcome(EmailVerificationOutcome.Failed);
      return;
    }

    let cancelled = false;
    void authRepository
      .verifyEmail(token)
      .then((result) => {
        if (cancelled) {return;}
        // `verified: false` means the token did not match a live, unconsumed
        // row — already used, expired, or burned by an admin activation. The
        // account may well be usable, so the copy invites a sign-in attempt
        // rather than declaring a failure.
        setOutcome(
          result.verified
            ? EmailVerificationOutcome.Verified
            : EmailVerificationOutcome.AlreadyHandled,
        );
      })
      .catch(() => {
        if (!cancelled) {setOutcome(EmailVerificationOutcome.Failed);}
      });

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  return { outcome };
}
