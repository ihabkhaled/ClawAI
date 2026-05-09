import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

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

export function useWebhookDeliveriesPage(): UseWebhookDeliveriesPageResult {
  const [filter, setFilter] = useState<WebhookDeliveryFilter>({});
  const queryClient = useQueryClient();

  const filterKey = {
    provider: filter.provider ?? '',
    connectorId: filter.connectorId ?? '',
    status: filter.status ?? '',
  };

  const query = useQuery({
    queryKey: queryKeys.webhookDeliveries.list(filterKey),
    queryFn: () => listWebhookDeliveries({ ...filter, limit: 50 }),
    staleTime: 30_000,
  });

  const replayMutation = useMutation({
    mutationFn: (id: string) => replayWebhookDelivery(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.webhookDeliveries.all });
    },
  });

  const onReplay = useCallback(
    (id: string): void => {
      void replayMutation.mutateAsync(id);
    },
    [replayMutation],
  );

  const deliveries: WebhookDelivery[] = query.data ?? [];

  return {
    deliveries,
    isLoading: query.isLoading,
    isError: query.isError,
    error: (query.error as Error | null) ?? null,
    filter,
    setFilter,
    isReplaying: replayMutation.isPending,
    onReplay,
  };
}
