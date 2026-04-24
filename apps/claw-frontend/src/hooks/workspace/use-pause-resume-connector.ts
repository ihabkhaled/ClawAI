import { useMutation, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '../../repositories/shared/query-keys';
import {
  pauseConnector,
  resumeConnector,
} from '../../repositories/workspace/sync-health.repository';
import type {
  PauseConnectorMutationInput,
  UsePauseResumeConnectorResult,
} from '../../types/sync-health-hook.types';
import type { WorkspaceConnector } from '../../types/workspace.types';

export function usePauseResumeConnector(): UsePauseResumeConnectorResult {
  const queryClient = useQueryClient();
  const invalidate = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.workspaceSyncHealth.all });
    await queryClient.invalidateQueries({ queryKey: queryKeys.workspaceConnectors.all });
  };
  const pauseMutation = useMutation<WorkspaceConnector, Error, PauseConnectorMutationInput>({
    mutationFn: ({ connectorId, reason }) => pauseConnector(connectorId, { reason }),
    onSuccess: invalidate,
  });
  const resumeMutation = useMutation<WorkspaceConnector, Error, string>({
    mutationFn: (connectorId) => resumeConnector(connectorId),
    onSuccess: invalidate,
  });
  return {
    pause: (connectorId, reason) => pauseMutation.mutate({ connectorId, reason }),
    resume: (connectorId) => resumeMutation.mutate(connectorId),
    isPending: pauseMutation.isPending || resumeMutation.isPending,
    error: pauseMutation.error ?? resumeMutation.error,
  };
}
