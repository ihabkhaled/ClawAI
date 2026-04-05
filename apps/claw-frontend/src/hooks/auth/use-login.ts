import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

import { ROUTES } from '@/constants';
import { authService } from '@/services/auth/auth.service';
import type { LoginRequest } from '@/types';
import { showToast } from '@/utilities';

export function useLogin() {
  const router = useRouter();

  const mutation = useMutation({
    mutationFn: (data: LoginRequest) => authService.login(data),
    onSuccess: () => {
      showToast.success({ title: 'Login successful' });
      router.push(ROUTES.CHAT);
    },
    onError: (error: Error) => {
      showToast.apiError(error, 'Failed to login');
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
