import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

import { ROUTES } from '@/constants';
import { useTranslation } from '@/lib/i18n';
import { authService } from '@/services/auth/auth.service';
import { logger, showToast } from '@/utilities';

export function useLogout() {
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
      router.push(ROUTES.LOGIN);
    },
  });

  return {
    logout: mutation.mutate,
    isPending: mutation.isPending,
  };
}
