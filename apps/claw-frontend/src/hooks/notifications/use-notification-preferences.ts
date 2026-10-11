import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useToast } from '@/components/ui/use-toast';
import { NOTIFICATIONS_STALE_MS } from '@/constants/notifications.constants';
import { ToastVariant } from '@/enums/toast-variant.enum';
import { useTranslation } from '@/lib/i18n';
import { notificationsRepository } from '@/repositories/notifications/notifications.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import { useAuthStore } from '@/stores/auth.store';
import type { UseNotificationPreferencesReturn } from '@/types/notifications-ui.types';
import type {
  NotificationPreferences,
  NotificationPreferencesPatch,
} from '@/types/notifications.types';

/**
 * The person's channel choices. A switch flips at once (optimistic) and rolls back with a message
 * if the save fails, so the screen never shows a choice the server did not take.
 */
export function useNotificationPreferences(): UseNotificationPreferencesReturn {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();
  const key = queryKeys.notifications.preferences();

  const query = useQuery({
    queryKey: key,
    queryFn: () => notificationsRepository.getPreferences(),
    enabled: isAuthenticated,
    staleTime: NOTIFICATIONS_STALE_MS,
  });

  const mutation = useMutation({
    mutationFn: (patch: NotificationPreferencesPatch) =>
      notificationsRepository.savePreferences(patch),
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<NotificationPreferences>(key);
      if (previous !== undefined) {
        queryClient.setQueryData<NotificationPreferences>(key, { ...previous, ...patch });
      }
      return { previous };
    },
    onError: (_error, _patch, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(key, context.previous);
      }
      toast({
        title: t('notifications.preferences.saveFailed'),
        variant: ToastVariant.Destructive,
      });
    },
    onSuccess: (saved) => {
      queryClient.setQueryData(key, saved);
    },
  });

  return {
    preferences: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    isSaving: mutation.isPending,
    save: (patch) => mutation.mutate(patch),
  };
}
