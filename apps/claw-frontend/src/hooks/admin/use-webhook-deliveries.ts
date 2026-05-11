import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import {
  WEBHOOK_FETCH_LIMIT,
  WEBHOOK_FILTER_DEBOUNCE_MS,
} from '@/constants/admin-webhooks.constants';
import { useDebounce } from '@/hooks/common/use-debounce';
import { useTranslation } from '@/lib/i18n';
import {
  listWebhookDeliveries,
  replayWebhookDelivery,
} from '@/repositories/admin/webhook-deliveries.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type {
  UseWebhookDeliveriesPageResult,
  WebhookDelivery,
  WebhookDeliveryFilter,
} from '@/types/webhook-delivery.types';
import { showToast } from '@/utilities';

export function useWebhookDeliveriesPage(): UseWebhookDeliveriesPageResult {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<WebhookDeliveryFilter>({});
  const [replayingId, setReplayingId] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<Error | null>(null);
  const queryClient = useQueryClient();

  const debouncedFilter = useDebounce(filter, WEBHOOK_FILTER_DEBOUNCE_MS);

  const filterKey = {
    provider: debouncedFilter.provider ?? '',
    connectorId: debouncedFilter.connectorId ?? '',
    signatureValid: debouncedFilter.signatureValid ?? null,
  };

  const query = useQuery({
    queryKey: queryKeys.webhookDeliveries.list(filterKey),
    queryFn: () => listWebhookDeliveries({ ...debouncedFilter, limit: WEBHOOK_FETCH_LIMIT }),
    staleTime: 30_000,
  });

  const replayMutation = useMutation({
    mutationFn: (id: string) => replayWebhookDelivery(id),
    onMutate: (id: string) => {
      setReplayingId(id);
      setMutationError(null);
    },
    onSuccess: () => {
      showToast.success({ description: t('adminWebhooks.replaySucceeded') });
      void queryClient.invalidateQueries({ queryKey: queryKeys.webhookDeliveries.all });
    },
    onError: (err: Error) => {
      setMutationError(err);
      showToast.apiError(err, t('adminWebhooks.replayFailed'));
    },
    onSettled: () => {
      setReplayingId(null);
    },
  });

  const onReplay = useCallback(
    (id: string): void => {
      void replayMutation.mutateAsync(id).catch(() => {
        // already surfaced via onError; swallow promise rejection here
      });
    },
    [replayMutation],
  );

  const clearMutationError = useCallback((): void => {
    setMutationError(null);
  }, []);

  const deliveries: WebhookDelivery[] = query.data ?? [];

  return {
    deliveries,
    isLoading: query.isLoading,
    isError: query.isError,
    error: (query.error as Error | null) ?? null,
    filter,
    setFilter,
    isReplaying: replayMutation.isPending,
    replayingId,
    onReplay,
    mutationError,
    clearMutationError,
  };
}
