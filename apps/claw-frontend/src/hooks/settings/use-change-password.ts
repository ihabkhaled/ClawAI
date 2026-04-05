import { useMutation } from '@tanstack/react-query';

import { preferencesService } from '@/services/preferences/preferences.service';
import type { ChangePasswordRequest } from '@/types';
import { showToast } from '@/utilities';

export function useChangePassword(onSuccess?: () => void) {
  const mutation = useMutation({
    mutationFn: (data: ChangePasswordRequest) => preferencesService.changePassword(data),
    onSuccess: () => {
      showToast.success({ title: 'Password changed successfully' });
      onSuccess?.();
    },
    onError: (error: Error) => {
      showToast.apiError(error, 'Failed to change password');
    },
  });

  return {
    changePassword: mutation.mutate,
    isPending: mutation.isPending,
  };
}
