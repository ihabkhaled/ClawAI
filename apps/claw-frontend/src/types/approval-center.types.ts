import type { ReactNode } from 'react';

import type { TranslateFunction } from './i18n.types';
import type { BulkApproveOutcome, WorkspaceAction } from './workspace.types';

export type ApprovalCardProps = {
  action: WorkspaceAction;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onEdit: (id: string) => void;
  isActing: boolean;
  t: TranslateFunction;
};

export type ApprovalBulkBarProps = {
  selectedCount: number;
  onApproveAll: () => void;
  onClearSelection: () => void;
  isPending: boolean;
  t: TranslateFunction;
};

export type ApprovalEditDialogProps = {
  action: WorkspaceAction | null;
  open: boolean;
  onClose: () => void;
  onSave: (actionId: string, payload: Record<string, unknown>, reason?: string) => void;
  isPending: boolean;
  t: TranslateFunction;
};

export type ApprovalRejectDialogProps = {
  actionId: string | null;
  open: boolean;
  onClose: () => void;
  onSubmit: (actionId: string, reason?: string) => void;
  isPending: boolean;
  t: TranslateFunction;
};

export type UseApprovalsPageResult = {
  actions: WorkspaceAction[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  selectedIds: Set<string>;
  toggleSelect: (id: string) => void;
  clearSelection: () => void;
  editTarget: WorkspaceAction | null;
  setEditTarget: (action: WorkspaceAction | null) => void;
  rejectTargetId: string | null;
  setRejectTargetId: (id: string | null) => void;
  lastBulkOutcome: BulkApproveOutcome | null;
  handleApprove: (id: string) => void;
  handleReject: (id: string, reason?: string) => void;
  handleEdit: (id: string, payload: Record<string, unknown>, reason?: string) => void;
  handleBulkApprove: () => void;
  isActing: boolean;
};

export type ApprovalPageRender = {
  header: ReactNode;
  body: ReactNode;
};

export type ApprovalsContentProps = {
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  actions: WorkspaceAction[];
  selectedIds: Set<string>;
  toggleSelect: (id: string) => void;
  handleApprove: (id: string) => void;
  setRejectTargetId: (id: string | null) => void;
  setEditTarget: (action: WorkspaceAction | null) => void;
  isActing: boolean;
  t: TranslateFunction;
};
