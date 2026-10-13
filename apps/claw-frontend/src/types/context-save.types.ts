import type {
  ContextSaveMemoryType,
  ContextSaveMode,
  ContextSaveProposal,
  ContextSaveProposalConfirmRequest,
} from '@claw/shared-types';

import type { ContextSaveFieldError } from '@/enums';

import type { ChatMessage } from './chat.types';

export type {
  ContextSaveMemoryType,
  ContextSaveMode,
  ContextSaveProposal,
  ContextSaveProposalConfirmRequest,
};

/** The editable state of the "Remember this" dialog (ADR-168). */
export type ContextSaveProposalDraft = {
  includeMemory: boolean;
  memoryType: ContextSaveMemoryType;
  memoryText: string;
  includePack: boolean;
  packContent: string;
  /** An existing pack id, `CONTEXT_SAVE_NEW_PACK_CHOICE`, or '' while nothing is picked. */
  packChoice: string;
  newPackName: string;
};

export type ContextSaveProposalErrors = {
  nothingSelected: boolean;
  memoryText: ContextSaveFieldError | null;
  packContent: ContextSaveFieldError | null;
  packChoice: ContextSaveFieldError | null;
  newPackName: ContextSaveFieldError | null;
};

export type UseContextSaveProposalFormReturn = {
  draft: ContextSaveProposalDraft;
  errors: ContextSaveProposalErrors;
  canSave: boolean;
  request: ContextSaveProposalConfirmRequest | null;
  setIncludeMemory: (value: boolean) => void;
  setMemoryType: (value: ContextSaveMemoryType) => void;
  setMemoryText: (value: string) => void;
  setIncludePack: (value: boolean) => void;
  setPackContent: (value: string) => void;
  setPackChoice: (value: string) => void;
  setNewPackName: (value: string) => void;
};

export type UseContextSaveModeReturn = {
  mode: ContextSaveMode;
  setMode: (mode: ContextSaveMode) => void;
};

export type UseContextSaveProposalDialogReturn = {
  form: UseContextSaveProposalFormReturn;
  actions: UseContextSaveProposalActionsReturn;
  /** The "always save automatically" tick; applied only when Save is pressed. */
  alwaysAuto: boolean;
  onAlwaysAutoChange: (value: boolean) => void;
  onSave: () => void;
  onOpenChange: (open: boolean) => void;
  onCloseAutoFocus: (event: Event) => void;
};

export type UseContextSaveProposalActionsReturn = {
  confirm: (request: ContextSaveProposalConfirmRequest) => void;
  dismiss: () => void;
  isConfirming: boolean;
  isDismissing: boolean;
  /** Why the last confirm did not complete: a failed call, or a save that stopped halfway. */
  errorMessage: string | null;
};

/** The message the dialog is open for, resolved from the thread's messages. */
export type ContextSaveProposalTarget = {
  messageId: string;
  proposal: ContextSaveProposal;
};

export type UseContextSaveProposalHostParams = {
  threadId: string;
  messages: ChatMessage[];
  /** False while the first page of messages is still loading. */
  isReady: boolean;
  /**
   * True while the messages query is fetching. The "already in the thread" baseline
   * is taken only once this is false, so a cached copy shown before the first fetch
   * settles can never become the baseline.
   */
  isFetching: boolean;
};

export type UseContextSaveProposalHostReturn = {
  target: ContextSaveProposalTarget | null;
  close: () => void;
};

export type ContextSaveProposalStore = {
  openMessageId: string | null;
  /** True while the open dialog's save or dismissal is in flight. */
  isBusy: boolean;
  /**
   * Why the last confirm or dismissal on a message did not complete, by message id.
   * Held here, not in the dialog, because a refetch can unmount and remount the
   * dialog right after the failure and the reason must survive that.
   */
  errors: Record<string, string>;
  open: (messageId: string) => void;
  close: () => void;
  setBusy: (isBusy: boolean) => void;
  setError: (messageId: string, message: string) => void;
  clearError: (messageId: string) => void;
};

export type ContextSaveProposalHostProps = UseContextSaveProposalHostParams;

export type ContextSaveProposalDialogProps = {
  messageId: string;
  threadId: string;
  proposal: ContextSaveProposal;
  onClose: () => void;
};
