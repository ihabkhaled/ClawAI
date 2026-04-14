import { useState } from 'react';

import type { WorkspaceActionStatus } from '../../enums/workspace-action-status.enum';
import type { CreateWorkspaceActionRequest, WorkspaceAction } from '../../types/workspace.types';

import {
  useApproveWorkspaceAction,
  useCreateWorkspaceAction,
  useRejectWorkspaceAction,
} from './use-workspace-action-mutations';
import { useWorkspaceActions } from './use-workspace-actions';

export function useWorkspaceActionsPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<WorkspaceActionStatus | undefined>();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<WorkspaceAction | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const { data, isLoading, isError } = useWorkspaceActions({
    page,
    pageSize: 20,
    status: statusFilter,
  });
  const createMutation = useCreateWorkspaceAction();
  const approveMutation = useApproveWorkspaceAction();
  const rejectMutation = useRejectWorkspaceAction();

  const actions = data?.data ?? [];
  const total = data?.total ?? 0;

  const handleCreate = (dto: CreateWorkspaceActionRequest) => {
    createMutation.mutate(dto, { onSuccess: () => setIsCreateOpen(false) });
  };

  const handleApprove = (id: string) => approveMutation.mutate(id);

  const handleRejectSubmit = () => {
    if (rejectTarget === null) {
      return;
    }
    rejectMutation.mutate(
      { id: rejectTarget.id, dto: { reason: rejectReason || undefined } },
      {
        onSuccess: () => {
          setRejectTarget(null);
          setRejectReason('');
        },
      },
    );
  };

  return {
    actions,
    total,
    page,
    setPage,
    isLoading,
    isError,
    statusFilter,
    setStatusFilter,
    isCreateOpen,
    setIsCreateOpen,
    handleCreate,
    isCreating: createMutation.isPending,
    handleApprove,
    isApproving: approveMutation.isPending,
    rejectTarget,
    setRejectTarget,
    rejectReason,
    setRejectReason,
    handleRejectSubmit,
    isRejecting: rejectMutation.isPending,
  };
}
