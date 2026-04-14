import { useMutation, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '../../repositories/shared/query-keys';
import {
  approveWorkspaceAction,
  createWorkspaceAction,
  rejectWorkspaceAction,
} from '../../repositories/workspace/workspace.repository';
import type {
  CreateWorkspaceActionRequest,
  RejectWorkspaceActionRequest,
} from '../../types/workspace.types';

export function useCreateWorkspaceAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateWorkspaceActionRequest) => createWorkspaceAction(dto),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.workspaceActions.all });
    },
  });
}

export function useApproveWorkspaceAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => approveWorkspaceAction(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.workspaceActions.all });
    },
  });
}

export function useRejectWorkspaceAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto?: RejectWorkspaceActionRequest }) =>
      rejectWorkspaceAction(id, dto),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.workspaceActions.all });
    },
  });
}
