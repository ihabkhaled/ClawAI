import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useTranslation } from '@/lib/i18n';
import { routingRepository } from '@/repositories/routing/routing.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { ReviewCaseRequest } from '@/types';
import { logger, showToast } from '@/utilities';

export function useReviewCase() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (params: { caseId: string; data: ReviewCaseRequest }) =>
      routingRepository.reviewCase(params.caseId, params.data),
    onSuccess: () => {
      logger.info({ component: 'replay', action: 'review-case', message: 'Case reviewed' });
      showToast.success({ title: t('replay.caseReviewed') });
      void queryClient.invalidateQueries({ queryKey: queryKeys.replay.runs.all() });
    },
    onError: (error: Error) => {
      logger.error({ component: 'replay', action: 'review-error', message: error.message });
      showToast.apiError(error, t('replay.caseReviewFailed'));
    },
  });

  return {
    reviewCase: mutation.mutate,
    isPending: mutation.isPending,
    isError: mutation.isError,
  };
}
