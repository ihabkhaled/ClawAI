import { useMutation } from '@tanstack/react-query';

import { useTranslation } from '@/lib/i18n';
import { routingRepository } from '@/repositories/routing/routing.repository';
import type { ReplayFilters } from '@/types';
import { logger, showToast } from '@/utilities';

export function useReplayRouting() {
  const { t } = useTranslation();

  const mutation = useMutation({
    mutationFn: (filters: ReplayFilters) => {
      logger.info({ component: 'replay', action: 'replay-routing', message: 'Running routing replay' });
      return routingRepository.replayRouting(filters);
    },
    onSuccess: (data) => {
      logger.info({ component: 'replay', action: 'replay-success', message: `Replayed ${String(data.totalReplayed)} decisions` });
      showToast.success({ title: t('replay.replayComplete') });
    },
    onError: (error: Error) => {
      logger.error({ component: 'replay', action: 'replay-error', message: error.message });
      showToast.apiError(error, t('replay.replayFailed'));
    },
  });

  return {
    replayRouting: mutation.mutate,
    data: mutation.data,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  };
}
