import { useMutation, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '../../repositories/shared/query-keys';
import {
  createWorkspaceConnector,
  updateWorkspaceConnector,
  deleteWorkspaceConnector,
  testWorkspaceConnectorHealth,
  triggerWorkspaceSync,
} from '../../repositories/workspace/workspace.repository';
import type {
  CreateWorkspaceConnectorRequest,
  UpdateWorkspaceConnectorRequest,
} from '../../types/workspace.types';

export function useCreateWorkspaceConnector() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateWorkspaceConnectorRequest) => createWorkspaceConnector(dto),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.workspaceConnectors.all });
    },
  });
}

export function useUpdateWorkspaceConnector(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: UpdateWorkspaceConnectorRequest) => updateWorkspaceConnector(id, dto),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.workspaceConnectors.all });
    },
  });
}

export function useDeleteWorkspaceConnector() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteWorkspaceConnector(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.workspaceConnectors.all });
    },
  });
}

export function useTestWorkspaceConnectorHealth() {
  return useMutation({
    mutationFn: (id: string) => testWorkspaceConnectorHealth(id),
  });
}

export function useTriggerWorkspaceSync() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, delta }: { id: string; delta?: boolean }) => triggerWorkspaceSync(id, delta),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.workspaceConnectors.all });
    },
  });
}
