import { useMutation } from '@tanstack/react-query';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { useTranslation } from '@/lib/i18n';
import { authService } from '@/services/auth/auth.service';
import type { LoginRequest } from '@/types';
import type { LoginBotCheckHooks } from '@/types/bot-check.types';
import { logger, showToast } from '@/utilities';
import { saveCredential } from '@/utilities/credential-storage.utility';
import { withLocaleOf } from '@/utilities/locale.utility';
import { resolveLoginReturn } from '@/utilities/safe-return-route.utility';

/**
 * `botCheck` decides when sign-in carries bot checks: never up front, once after
 * a 428 BOT_CHECK_REQUIRED (one automatic retry), and on every attempt after
 * that. The device object is always sent (authService.loginWithBotCheck).
 */
export function useLogin(botCheck: LoginBotCheckHooks) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { t } = useTranslation();

  const mutation = useMutation({
    mutationFn: (data: LoginRequest) => authService.loginWithBotCheck(data, botCheck),
    // Trigger the browser's "Save password?" prompt via the Credential
    // Management API. SPA logins don't navigate, so Chrome/Edge can't
    // detect the form submission heuristically — store explicitly here.
    onSuccess: (_data, variables) => {
      void saveCredential({ email: variables.email, password: variables.password });
      logger.info({ component: 'auth', action: 'login', message: 'User logged in successfully' });
      showToast.success({ title: t('toast.loginSuccess') });
      router.push(
        withLocaleOf(
          resolveLoginReturn(searchParams.get('returnTo'), globalThis.location.hash),
          pathname,
        ),
      );
    },
    onError: (error: Error) => {
      logger.error({ component: 'auth', action: 'login-error', message: 'Login failed' });
      // `translate` so a 429 reads "try again in N minutes" in the user's
      // language instead of the backend's English sentence.
      showToast.apiError(error, t('toast.loginFailed'), { translate: t });
    },
  });

  return {
    login: mutation.mutate,
    loginAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  };
}
