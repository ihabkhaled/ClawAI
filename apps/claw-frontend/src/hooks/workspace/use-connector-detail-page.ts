import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';

import { ROUTES } from '@/constants';
import { useCreateThread } from '@/hooks/chat/use-create-thread';
import { useTranslation } from '@/lib/i18n';
import { queryKeys } from '@/repositories/shared/query-keys';
import {
  getWorkspaceConnector,
  listWorkspaceHealthEvents,
  listWorkspaceSyncRuns,
} from '@/repositories/workspace/workspace.repository';
import type { UseConnectorDetailPageReturn } from '@/types';
import { buildConnectorSystemPrompt } from '@/utilities/workspace-chat-handoff.utility';

import {
  useDeleteWorkspaceConnector,
  useTestWorkspaceConnectorHealth,
  useTriggerWorkspaceSync,
} from './use-workspace-connector-mutations';
import { useWorkspaceObjects } from './use-workspace-objects';

export function useConnectorDetailPage(): UseConnectorDetailPageReturn {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useParams<{ connectorId: string }>();
  const connectorId = params.connectorId ?? '';

  const syncRunsQuery = useQuery({
    queryKey: queryKeys.workspaceConnectors.syncRuns(connectorId),
    queryFn: () => listWorkspaceSyncRuns(connectorId, 20),
    enabled: connectorId.length > 0,
    staleTime: 5_000,
    refetchInterval: (query) => {
      const latest = query.state.data?.[0];
      if (latest?.status === 'RUNNING' || latest?.status === 'PENDING') {
        return 2_000;
      }
      return false;
    },
  });

  const isActivating = syncRunsQuery.data?.[0]?.status === 'RUNNING';

  const connectorQuery = useQuery({
    queryKey: queryKeys.workspaceConnectors.detail(connectorId),
    queryFn: () => getWorkspaceConnector(connectorId),
    enabled: connectorId.length > 0,
    staleTime: 5_000,
    refetchInterval: isActivating ? 2_000 : false,
  });

  const healthEventsQuery = useQuery({
    queryKey: queryKeys.workspaceConnectors.healthEvents(connectorId),
    queryFn: () => listWorkspaceHealthEvents(connectorId, 20),
    enabled: connectorId.length > 0,
    staleTime: 5_000,
  });

  const objectsQuery = useWorkspaceObjects(
    connectorId.length > 0 ? { connectorId, limit: 20 } : undefined,
    isActivating ? 2_000 : undefined,
  );

  const syncMutation = useTriggerWorkspaceSync();
  const healthMutation = useTestWorkspaceConnectorHealth();
  const deleteMutation = useDeleteWorkspaceConnector();
  const { createThread, isPending: isAskingAi } = useCreateThread();

  const onBack = (): void => router.push(ROUTES.WORKSPACE);
  const onSync = (): void => syncMutation.mutate({ id: connectorId });
  const onHealthCheck = (): void => healthMutation.mutate(connectorId);
  const onDelete = (): void => {
    deleteMutation.mutate(connectorId, {
      onSuccess: () => router.push(ROUTES.WORKSPACE),
    });
  };
  const onAskAi = (): void => {
    if (connectorQuery.data === undefined) {
      return;
    }
    createThread({
      title: t('connectorDetail.askAiTitle', { name: connectorQuery.data.name }),
      systemPrompt: buildConnectorSystemPrompt(connectorQuery.data),
    });
  };

  return {
    t,
    connectorId,
    connector: connectorQuery.data,
    syncRuns: syncRunsQuery.data ?? [],
    healthEvents: healthEventsQuery.data ?? [],
    recentObjects: objectsQuery.data?.data ?? [],
    isLoading:
      connectorQuery.isLoading ||
      syncRunsQuery.isLoading ||
      healthEventsQuery.isLoading ||
      objectsQuery.isLoading,
    isError:
      connectorQuery.isError ||
      syncRunsQuery.isError ||
      healthEventsQuery.isError ||
      objectsQuery.isError,
    error: (connectorQuery.error ?? syncRunsQuery.error ?? healthEventsQuery.error) as Error | null,
    isSyncing: syncMutation.isPending,
    isCheckingHealth: healthMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isActivating,
    isAskingAi,
    onSync,
    onHealthCheck,
    onDelete,
    onAskAi,
    onBack,
  };
}
