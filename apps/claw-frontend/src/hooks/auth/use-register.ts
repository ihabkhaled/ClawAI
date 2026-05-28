import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

import { ROUTES } from '@/constants';
import { useTranslation } from '@/lib/i18n';
import { authService } from '@/services/auth/auth.service';
import type { RegisterRequest } from '@/types';
import { logger, showToast } from '@/utilities';

export function useRegister() {
  const router = useRouter();
  const { t } = useTranslation();

  const mutation = useMutation({
    mutationFn: (data: RegisterRequest) => authService.register(data),
    onSuccess: () => {
      logger.info({
        component: 'auth',
        action: 'register',
        message: 'User registered successfully',
      });
      showToast.success({ title: t('toast.registerSuccess') });
      router.push(ROUTES.CHAT);
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
