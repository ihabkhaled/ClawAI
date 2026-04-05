import { useMutation, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/repositories/shared/query-keys';
import { preferencesService } from '@/services/preferences/preferences.service';
import type { UpdatePreferencesRequest } from '@/types';
import { showToast } from '@/utilities';

export function useUpdatePreferences() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data: UpdatePreferencesRequest) => preferencesService.updatePreferences(data),
    onSuccess: () => {
      showToast.success({ title: 'Preferences updated' });
      void queryClient.invalidateQueries({ queryKey: queryKeys.auth.me });
    },
    onError: (error: Error) => {
      showToast.apiError(error, 'Failed to update preferences');
    },
  });

  return {
    updatePreferences: mutation.mutate,
    updatePreferencesAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
  };
}
