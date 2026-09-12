import { useMutation } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';

import { ROUTES } from '@/constants';
import { useTranslation } from '@/lib/i18n';
import { authService } from '@/services/auth/auth.service';
import type { RegisterRequest } from '@/types';
import { logger, showToast } from '@/utilities';
import { saveCredential } from '@/utilities/credential-storage.utility';
import { safeReturnRoute } from '@/utilities/safe-return-route.utility';

export function useRegister() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();

  const mutation = useMutation({
    mutationFn: (data: RegisterRequest) => authService.register(data),
    // Trigger the browser's "Save password?" prompt via the Credential
    // Management API. SPA flow — no real form-navigation — so Chrome/Edge
    // can't detect the submit heuristically; store explicitly here.
    onSuccess: (_data, variables) => {
      void saveCredential({ email: variables.email, password: variables.password });
      logger.info({
        component: 'auth',
        action: 'register',
        message: 'User registered successfully',
      });
      showToast.success({ title: t('toast.registerSuccess') });
      // NOT to /login. The account exists but is PENDING, so a sign-in attempt
      // is guaranteed to fail — sending the user there right after a green
      // success toast is how "account created" turned into "login failed" with
      // nothing in between explaining why. /check-email is that explanation.
      // The address travels in the query string because there is no session to
      // carry it, and the page treats it as display text plus an argument to
      // the resend endpoint, which answers identically for every address.
      const params = new URLSearchParams({ email: variables.email });
      const requestedReturnTo = searchParams.get('returnTo');
      const returnTo = requestedReturnTo ? safeReturnRoute(requestedReturnTo) : null;
      if (returnTo !== null) {
        params.set('returnTo', returnTo);
      }
      router.push(`${ROUTES.CHECK_EMAIL}?${params.toString()}`);
    },
    onError: (error: Error) => {
      logger.error({ component: 'auth', action: 'register-error', message: 'Registration failed' });
      showToast.apiError(error, t('auth.registerFailed'));
    },
  });

  return {
    register: mutation.mutate,
    registerAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  };
}
