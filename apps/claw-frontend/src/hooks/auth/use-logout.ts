import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

import { ROUTES } from '@/constants';
import { useTranslation } from '@/lib/i18n';
import { authService } from '@/services/auth/auth.service';
import { logger, showToast } from '@/utilities';

// `redirectTo` null keeps the visitor on the current page (the public marketing
// pages); the default sends them to the login screen as the portal always has.
export function useLogout(redirectTo: string | null = ROUTES.LOGIN) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const mutation = useMutation({
    mutationFn: () => {
      logger.info({ component: 'auth', action: 'logout', message: 'User logged out' });
      return authService.logout();
    },
    onError: (err: unknown) => {
      showToast.apiError(err, t('toast.logoutFailed'));
    },
    onSettled: () => {
      queryClient.clear();
      if (redirectTo !== null) {
        router.push(redirectTo);
      }
    },
  });

  return {
    logout: mutation.mutate,
    isPending: mutation.isPending,
  };
}
