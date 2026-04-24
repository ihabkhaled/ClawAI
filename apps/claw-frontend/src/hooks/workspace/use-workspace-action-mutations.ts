import { useMutation, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '../../repositories/shared/query-keys';
import {
  approveWorkspaceAction,
  bulkApproveWorkspaceActions,
  createWorkspaceAction,
  editWorkspaceAction,
  rejectWorkspaceAction,
} from '../../repositories/workspace/workspace.repository';
import type {
  BulkApproveOutcome,
  BulkApproveWorkspaceActionsRequest,
  CreateWorkspaceActionRequest,
  EditWorkspaceActionRequest,
  RejectWorkspaceActionRequest,
  WorkspaceAction,
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

export function useEditWorkspaceAction() {
  const queryClient = useQueryClient();
  return useMutation<WorkspaceAction, Error, { id: string; dto: EditWorkspaceActionRequest }>({
    mutationFn: ({ id, dto }) => editWorkspaceAction(id, dto),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.workspaceActions.all });
    },
  });
}

export function useBulkApproveWorkspaceActions() {
  const queryClient = useQueryClient();
  return useMutation<BulkApproveOutcome, Error, BulkApproveWorkspaceActionsRequest>({
    mutationFn: (dto) => bulkApproveWorkspaceActions(dto),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.workspaceActions.all });
    },
  });
}
