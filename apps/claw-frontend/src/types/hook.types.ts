import type { MessageFeedback } from '@/enums';

import type { AdminUser, AuditLog } from './audit.types';
import type {
  ChatMessage,
  ChatThread,
  FallbackAttemptInfo,
  UseVirtualizedMessagesReturn,
} from './chat.types';
import type { ModelSelection } from './component.types';
import type { UploadFileRequest } from './file.types';
import type { AggregatedHealth } from './health.types';
import type { TranslateFunction } from './i18n.types';
import type { ReplayBatchResult } from './replay.types';

// ─── Admin hook types ───────────────────────────────────────────────────────

export type UseAdminPageReturn = {
  t: TranslateFunction;
  user: { role: string } | null;
  actionPending: string | null;
  users: AdminUser[];
  activeCount: number;
  usersQuery: {
    isLoading: boolean;
    isError: boolean;
  };
  healthQuery: {
    isLoading: boolean;
    isError: boolean;
    data: AggregatedHealth | undefined;
  };
  handleChangeRole: (userId: string, role: string) => void;
  handleDeactivate: (userId: string) => void;
  isRoleChangePending: boolean;
  isDeactivatePending: boolean;
};

export type UseUserTableStateReturn = {
  editingUserId: string | null;
  setEditingUserId: (id: string | null) => void;
  handleRoleSelect: (userId: string, role: string, onChangeRole: (userId: string, role: string) => void) => void;
};

// ─── Audit hook types ───────────────────────────────────────────────────────

export type UseAuditsPageReturn = {
  t: TranslateFunction;
  page: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  action: string | undefined;
  setAction: (value: string | undefined) => void;
  severity: string | undefined;
  setSeverity: (value: string | undefined) => void;
  search: string;
  setSearch: (value: string) => void;
  auditLogs: AuditLog[];
  meta: { total: number; page: number; limit: number; totalPages: number };
  isLoading: boolean;
  isError: boolean;
  handleActionChange: (value: string | undefined) => void;
  handleSeverityChange: (value: string | undefined) => void;
  handleSearchChange: (value: string) => void;
};

// ─── Chat hook types ────────────────────────────────────────────────────────

export type UseFileAttachmentPickerStateParams = {
  selectedFileIds: string[];
  onChange: (fileIds: string[]) => void;
  uploadFile: (data: UploadFileRequest) => void;
};

export type UseFileAttachmentPickerStateReturn = {
  dragOver: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleToggle: (fileId: string, checked: boolean) => void;
  handleFileUpload: (file: File) => void;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleDrop: (e: React.DragEvent) => void;
  handleDragOver: (e: React.DragEvent) => void;
  handleDragLeave: () => void;
  selectedCount: number;
};

export type UseImageErrorStateReturn = {
  isPickerOpen: boolean;
  togglePicker: () => void;
  closePicker: () => void;
};

export type UseImageGenerationBubbleStateParams = {
  generationId: string;
};

export type UseImageGenerationBubbleStateReturn = {
  activeGenId: string;
  handleRetry: () => void;
  handleRetryWithModel: (provider: string, model: string) => void;
};

export type UseMessageComposerStateParams = {
  onSend: (content: string, modelSelection?: ModelSelection, fileIds?: string[]) => void;
  isPending: boolean;
  threadModel?: ModelSelection | null;
};

export type UseMessageComposerStateReturn = {
  content: string;
  setContent: (value: string) => void;
  validationError: string | null;
  modelOverride: ModelSelection | null;
  setModelOverride: (value: ModelSelection | null) => void;
  selectedFileIds: string[];
  setSelectedFileIds: (value: string[]) => void;
  handleSubmit: (e: React.FormEvent) => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  handleChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  activeModel: ModelSelection | null;
};

export type UseThreadDetailPageParams = {
  threadId: string;
};

export type UseThreadSettingsReturn = {
  isOpen: boolean;
  toggleOpen: () => void;
  systemPrompt: string;
  setSystemPrompt: (value: string) => void;
  temperature: number;
  setTemperature: (value: number) => void;
  maxTokens: string;
  setMaxTokens: (value: string) => void;
  selectedModel: ModelSelection | null;
  setSelectedModel: (value: ModelSelection | null) => void;
  contextPackIds: string[];
  setContextPackIds: (value: string[]) => void;
  handleSave: () => void;
  isPending: boolean;
};

export type UseThreadDetailPageReturn = {
  thread: ChatThread | null;
  messages: ChatMessage[];
  isLoadingThread: boolean;
  isLoadingMessages: boolean;
  isWaitingForResponse: boolean;
  fallbackAttempts: FallbackAttemptInfo[];
  streamError: string | null;
  isSending: boolean;
  isDeleting: boolean;
  virtualizedMessages: UseVirtualizedMessagesReturn;
  threadSettings: UseThreadSettingsReturn;
  handleSend: (content: string, modelSelection?: ModelSelection, fileIds?: string[]) => void;
  handleDelete: () => void;
  handleFeedback: (messageId: string, feedback: MessageFeedback | null) => void;
  handleRegenerate: (messageId: string) => void;
};

export type UseVirtualizedThreadsParams = {
  search?: string;
  showArchived?: boolean;
};

// ─── Common hook types ──────────────────────────────────────────────────────

export type UseToggleReturn = {
  isOpen: boolean;
  toggle: () => void;
  open: () => void;
  close: () => void;
};

// ─── Files hook types ───────────────────────────────────────────────────────

export type UseFileUploadZoneStateReturn = {
  isDragOver: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  handleDragOver: (e: React.DragEvent) => void;
  handleDragLeave: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent) => void;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleClick: () => void;
};

// ─── Layout hook types ──────────────────────────────────────────────────────

export type UseGlobalSearchControllerReturn = {
  inputRef: React.RefObject<HTMLInputElement | null>;
  threads: ChatThread[];
  isLoading: boolean;
  search: string;
  setSearch: (value: string) => void;
  isOpen: boolean;
  showResults: boolean;
  handleToggle: () => void;
  handleSelect: (threadId: string) => void;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  handleOpenChange: (open: boolean) => void;
};

export type UseSidebarControllerReturn = {
  isOpen: boolean;
  close: () => void;
  handleOverlayClick: () => void;
};

// ─── Replay hook types ────────────────────────────────────────────────────

export type UseReplayLabPageReturn = {
  t: TranslateFunction;
  routingMode: string | undefined;
  setRoutingMode: (value: string | undefined) => void;
  limit: number;
  setLimit: (value: number) => void;
  handleRunReplay: () => void;
  result: ReplayBatchResult | undefined;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
};
