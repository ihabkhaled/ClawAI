'use client';

import { useMutation } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { ROUTES } from '@/constants';
import { RESEND_COOLDOWN_TICK_MS } from '@/constants/auth-onboarding.constants';
import { useTranslation } from '@/lib/i18n';
import { authRepository } from '@/repositories/auth/auth.repository';
import type { UseCheckEmailPageReturn } from '@/types';
import { logger, showToast } from '@/utilities';

/**
 * Controller for the screen registration lands on.
 *
 * The address arrives in the query string rather than from a session, because
 * at this point there is no session and cannot be one — the whole reason this
 * screen exists is that the account is not usable yet. It is treated as
 * display-only text: it is echoed back to the user and handed to the resend
 * endpoint, never trusted for anything else. That endpoint answers
 * `{ accepted: true }` for every address, existing or not, so a stranger who
 * edits the query string learns nothing.
 *
 * **The countdown mirrors the server's decision; it is never the authority.**
 * The seconds shown come from the response's `retryAfterSeconds`, and the
 * button is disabled locally only to stop the obvious mistake of firing three
 * requests in two seconds. A user who reloads, or opens a second tab, is
 * refused by the server's own cooldown regardless of what any tab is showing —
 * which is the only place a rate limit can actually live.
 */
export function useCheckEmailPage(): UseCheckEmailPageReturn {
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const email = searchParams.get('email');
  // Registration can be reached from a checkout CTA, which carries a returnTo
  // all the way through. This screen is a new hop in that journey, so it has to
  // forward it — otherwise someone who signed up to buy a plan confirms their
  // address and lands on a generic sign-in form having lost the thing they came
  // for. It was already sanitised by safeReturnRoute before it got here.
  const returnTo = searchParams.get('returnTo');
  const loginHref =
    returnTo === null || returnTo.length === 0
      ? ROUTES.LOGIN
      : `${ROUTES.LOGIN}?returnTo=${encodeURIComponent(returnTo)}`;
  const [hasResent, setHasResent] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  const mutation = useMutation({
    mutationFn: (address: string) => authRepository.resendVerification(address),
    onSuccess: (result) => {
      setHasResent(true);
      setCooldownSeconds(Math.max(0, Math.ceil(result.retryAfterSeconds)));
      logger.info({
        component: 'auth',
        action: 'resend-verification',
        message: 'Verification email resend requested',
      });
      showToast.success({ title: t('auth.checkEmailResendSuccess') });
    },
    onError: () => {
      logger.error({
        component: 'auth',
        action: 'resend-verification-error',
        message: 'Verification email resend failed',
      });
      // Deliberately generic: the specific reason could confirm whether the
      // address exists, which is exactly what the endpoint refuses to say.
      showToast.error({ title: t('auth.checkEmailResendError') });
    },
  });

  useEffect(() => {
    if (cooldownSeconds <= 0) {
      return;
    }
    const timer = setTimeout(() => {
      setCooldownSeconds((remaining) => Math.max(0, remaining - 1));
    }, RESEND_COOLDOWN_TICK_MS);
    return () => clearTimeout(timer);
  }, [cooldownSeconds]);

  const resend = useCallback((): void => {
    if (email === null || email.length === 0 || cooldownSeconds > 0) {
      return;
    }
    mutation.mutate(email);
  }, [cooldownSeconds, email, mutation]);

  // Three states, one label. Resolved here rather than in the component so the
  // TSX stays render-only and the precedence (cooldown wins over "again") is
  // stated once, in a place a test can reach directly.
  const resendLabel =
    cooldownSeconds > 0
      ? t('auth.checkEmailResendCooldown', { seconds: cooldownSeconds })
      : t(hasResent ? 'auth.checkEmailResendAgain' : 'auth.checkEmailResend');

  return {
    email,
    // A single flag rather than repeating the null-and-empty check in the
    // component: an address arriving as an empty query param must behave
    // exactly like no address at all.
    hasAddress: email !== null && email.length > 0,
    loginHref,
    resend,
    isResending: mutation.isPending,
    hasResent,
    cooldownSeconds,
    resendLabel,
    t,
  };
}
