import { useMutation, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '../../repositories/shared/query-keys';
import { updateConnectorCadence } from '../../repositories/workspace/sync-health.repository';
import type {
  UpdateCadenceMutationInput,
  UseUpdateCadenceResult,
} from '../../types/sync-health-hook.types';
import type { WorkspaceConnector } from '../../types/workspace.types';

export function useUpdateCadence(): UseUpdateCadenceResult {
  const queryClient = useQueryClient();
  const mutation = useMutation<WorkspaceConnector, Error, UpdateCadenceMutationInput>({
    mutationFn: ({ connectorId, syncIntervalSeconds }) =>
      updateConnectorCadence(connectorId, { syncIntervalSeconds }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.workspaceSyncHealth.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.workspaceConnectors.all });
    },
  });
  return {
    mutate: (connectorId, syncIntervalSeconds) =>
      mutation.mutate({ connectorId, syncIntervalSeconds }),
    isPending: mutation.isPending,
    error: mutation.error,
  };
}
