import { useCallback, useMemo, useState } from 'react';

import { APPROVALS_PAGE_SIZE, APPROVALS_PENDING_STATUSES } from '@/constants/approvals.constants';
import { WorkspaceActionStatus } from '@/enums/workspace-action-status.enum';
import type { UseApprovalsPageResult } from '@/types/approval-center.types';
import type { BulkApproveOutcome, WorkspaceAction } from '@/types/workspace.types';

import {
  useApproveWorkspaceAction,
  useBulkApproveWorkspaceActions,
  useEditWorkspaceAction,
  useRejectWorkspaceAction,
} from './use-workspace-action-mutations';
import { useWorkspaceActions } from './use-workspace-actions';

export function useApprovalsPage(): UseApprovalsPageResult {
  const { data, isLoading, isError, error } = useWorkspaceActions({
    status: WorkspaceActionStatus.PENDING_APPROVAL,
    pageSize: APPROVALS_PAGE_SIZE,
  });

  const approveMutation = useApproveWorkspaceAction();
  const rejectMutation = useRejectWorkspaceAction();
  const editMutation = useEditWorkspaceAction();
  const bulkMutation = useBulkApproveWorkspaceActions();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editTarget, setEditTarget] = useState<WorkspaceAction | null>(null);
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);
  const [lastBulkOutcome, setLastBulkOutcome] = useState<BulkApproveOutcome | null>(null);

  const actions = useMemo(() => {
    const source = data?.data ?? [];
    return source.filter((action) =>
      APPROVALS_PENDING_STATUSES.has(action.status as WorkspaceActionStatus),
    );
  }, [data]);

  const toggleSelect = useCallback((id: string): void => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const clearSelection = useCallback((): void => {
    setSelectedIds(new Set());
  }, []);

  const handleApprove = useCallback(
    (id: string): void => {
      approveMutation.mutate(id);
    },
    [approveMutation],
  );

  const handleReject = useCallback(
    (id: string, reason?: string): void => {
      rejectMutation.mutate(
        { id, dto: reason === undefined ? undefined : { reason } },
        {
          onSuccess: () => setRejectTargetId(null),
        },
      );
    },
    [rejectMutation],
  );

  const handleEdit = useCallback(
    (id: string, payload: Record<string, unknown>, reason?: string): void => {
      editMutation.mutate(
        { id, dto: { payload, editReason: reason } },
        {
          onSuccess: () => setEditTarget(null),
        },
      );
    },
    [editMutation],
  );

  const handleBulkApprove = useCallback((): void => {
    if (selectedIds.size === 0) {
      return;
    }
    bulkMutation.mutate(
      { actionIds: Array.from(selectedIds) },
      {
        onSuccess: (outcome) => {
          setLastBulkOutcome(outcome);
          setSelectedIds(new Set());
        },
      },
    );
  }, [bulkMutation, selectedIds]);

  const isActing =
    approveMutation.isPending ||
    rejectMutation.isPending ||
    editMutation.isPending ||
    bulkMutation.isPending;

  return {
    actions,
    isLoading,
    isError,
    error: error as Error | null,
    selectedIds,
    toggleSelect,
    clearSelection,
    editTarget,
    setEditTarget,
    rejectTargetId,
    setRejectTargetId,
    lastBulkOutcome,
    handleApprove,
    handleReject,
    handleEdit,
    handleBulkApprove,
    isActing,
  };
}
