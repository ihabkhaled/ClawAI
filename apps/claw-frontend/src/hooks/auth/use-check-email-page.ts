'use client';

import { useMutation } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { useCallback, useState } from 'react';

import { ROUTES } from '@/constants';
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

  const mutation = useMutation({
    mutationFn: (address: string) => authRepository.resendVerification(address),
    onSuccess: () => {
      setHasResent(true);
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

  const resend = useCallback((): void => {
    if (email === null || email.length === 0) {
      return;
    }
    mutation.mutate(email);
  }, [email, mutation]);

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
    t,
  };
}
