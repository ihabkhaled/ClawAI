import type { LucideIcon } from 'lucide-react';

import type { SidebarItem } from '@/constants';
import type { ComponentSize, ConnectorStatus, RoutingMode } from '@/enums';

import type { AdminUser } from './audit.types';
import type { ChatMessage, ChatThread } from './chat.types';
import type { Connector, ConnectorModel, CreateConnectorRequest } from './connector.types';
import type { CreateContextPackItemRequest, CreateContextPackRequest } from './context-pack.types';
import type { UploadedFile } from './file.types';
import type { CreateMemoryRequest, MemoryRecord } from './memory.types';
import type { CreatePolicyRequest, RoutingDecision, RoutingPolicy } from './routing.types';

// ─── Common component props ──────────────────────────────────────────────────

export type DataTableColumn<T> = {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  className?: string;
};

export type DataTableProps<T> = {
  columns: DataTableColumn<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  emptyMessage?: string;
};

export type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
};

export type ErrorBoundaryProps = {
  children: React.ReactNode;
  fallback?: React.ReactNode;
};

export type ErrorBoundaryState = {
  hasError: boolean;
  error: Error | null;
};

export type LoadingSpinnerProps = {
  className?: string;
  size?: ComponentSize;
  label?: string;
};

export type PageHeaderProps = {
  title: string;
  description?: string;
  actions?: React.ReactNode;
};

export type StatusBadgeProps = {
  status: ConnectorStatus | string;
  className?: string;
};

// ─── Layout component props ──────────────────────────────────────────────────

export type SidebarNavItemProps = {
  item: SidebarItem;
};

// ─── Memory component props ─────────────────────────────────────────────────

export type MemoryCardProps = {
  memory: MemoryRecord;
  onToggle: (id: string) => void;
  onEdit: (memory: MemoryRecord) => void;
  onDelete: (id: string) => void;
  isTogglePending: boolean;
};

// ─── File component props ───────────────────────────────────────────────────

export type FileUploadZoneProps = {
  onFileSelected: (file: File) => void;
  isUploading: boolean;
  validationError: string | null;
};

export type FileListItemProps = {
  file: UploadedFile;
  onDelete: (id: string) => void;
  onViewChunks: (id: string) => void;
  isDeletePending: boolean;
};

// ─── Form validation types ──────────────────────────────────────────────────

export type FormFieldErrors = Record<string, string[] | undefined>;

// ─── Page-specific types ─────────────────────────────────────────────────────

export type ProvidersProps = {
  children: React.ReactNode;
};

// ─── Admin component props ──────────────────────────────────────────────────

export type UserTableProps = {
  users: AdminUser[];
  onChangeRole: (userId: string, role: string) => void;
  onDeactivate: (userId: string) => void;
  isRoleChangePending: boolean;
  isDeactivatePending: boolean;
};

// ─── Chat component props ───────────────────────────────────────────────────

export type MessageBubbleProps = {
  message: ChatMessage;
  routingDecision?: RoutingDecision | null;
};

export type MessageComposerProps = {
  onSend: (content: string) => void;
  isPending: boolean;
};

export type RoutingBadgeProps = {
  mode: RoutingMode;
  className?: string;
};

export type RoutingTransparencyProps = {
  decision: RoutingDecision;
};

export type ThreadListItemProps = {
  thread: ChatThread;
  isActive?: boolean;
};

// ─── Common component props (generic) ───────────────────────────────────────

export type VirtualizedListProps<T> = {
  data: T[];
  itemContent: (index: number, item: T) => React.ReactElement;
  className?: string;
  style?: React.CSSProperties;
  overscan?: number;
};

// ─── Connector component props ──────────────────────────────────────────────

export type ConnectorCardProps = {
  connector: Connector;
  onTest: (id: string) => void;
  onSync: (id: string) => void;
  onEdit: (connector: Connector) => void;
  onDelete: (id: string) => void;
  isTestPending: boolean;
  isSyncPending: boolean;
};

export type ConnectorFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateConnectorRequest) => void;
  isPending: boolean;
  connector?: Connector | null;
};

export type ModelTableProps = {
  models: ConnectorModel[];
  showProvider?: boolean;
  emptyMessage?: string;
};

// ─── Context pack component props ───────────────────────────────────────────

export type ContextPackFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateContextPackRequest) => void;
  isPending: boolean;
};

export type ContextPackItemFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateContextPackItemRequest) => void;
  isPending: boolean;
};

// ─── File component props (extended) ────────────────────────────────────────

export type FileChunksDialogProps = {
  fileId: string | null;
  onClose: () => void;
};

// ─── Memory component props (extended) ──────────────────────────────────────

export type MemoryFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateMemoryRequest) => void;
  isPending: boolean;
  memory?: MemoryRecord | null;
};

// ─── Observability component props ──────────────────────────────────────────

export type StatCardProps = {
  title: string;
  value: string | number;
  description?: string;
};

export type UsageBarItem = {
  label: string;
  value: number;
  secondaryValue?: number;
};

export type UsageChartProps = {
  title: string;
  items: UsageBarItem[];
  valueLabel?: string;
  secondaryLabel?: string;
};

// ─── Routing component props ────────────────────────────────────────────────

export type PolicyFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreatePolicyRequest) => void;
  isPending: boolean;
  policy?: RoutingPolicy | null;
};
