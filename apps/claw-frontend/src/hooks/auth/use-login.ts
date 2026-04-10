import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

import { ROUTES } from '@/constants';
import { useTranslation } from '@/lib/i18n';
import { authService } from '@/services/auth/auth.service';
import type { LoginRequest } from '@/types';
import { logger, showToast } from '@/utilities';

export function useLogin() {
  const router = useRouter();
  const { t } = useTranslation();

  const mutation = useMutation({
    mutationFn: (data: LoginRequest) => authService.login(data),
    onSuccess: () => {
      logger.info({ component: 'auth', action: 'login', message: 'User logged in successfully' });
      showToast.success({ title: t('toast.loginSuccess') });
      router.push(ROUTES.CHAT);
    },
    onError: (error: Error) => {
      logger.error({ component: 'auth', action: 'login-error', message: 'Login failed' });
      showToast.apiError(error, t('toast.loginFailed'));
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
