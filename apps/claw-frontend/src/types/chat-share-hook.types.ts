import type { ChatShareConfirmAction } from '@/enums/chat-share.enum';
import type { OwnerChatShare } from '@/types/chat-share.types';
import type { ShareChatButtonProps, ShareChatDialogProps } from '@/types/component.types';

export type UseChatShareQueryReturn = {
  /** null when the thread has never been shared. */
  share: OwnerChatShare | null;
  isLoading: boolean;
  isError: boolean;
};

export type UseChatShareMutationsReturn = {
  publish: (allowIndexing: boolean) => void;
  setIndexing: (allowIndexing: boolean) => void;
  refresh: () => void;
  regenerateUrl: () => void;
  revoke: () => void;
  /** Which action is in flight, so only that control shows a spinner. */
  pendingAction: string | null;
  error: string | null;
  clearError: () => void;
};

export type UseShareChatDialogReturn = UseChatShareQueryReturn &
  UseChatShareMutationsReturn & {
    isOpen: boolean;
    open: () => void;
    close: () => void;
    /** The publication warning must be acknowledged before publishing. */
    hasAcknowledged: boolean;
    toggleAcknowledged: () => void;
    /** Whether the owner asked for search-engine indexing. */
    allowIndexing: boolean;
    toggleAllowIndexing: () => void;
    /** Which destructive action is awaiting confirmation, if any. */
    confirming: ChatShareConfirmAction | null;
    requestConfirm: (action: ChatShareConfirmAction) => void;
    cancelConfirm: () => void;
    confirm: () => void;
    isCopied: boolean;
    copyUrl: () => void;
  };

export type UseShareChatControllerReturn = {
  buttonProps: ShareChatButtonProps;
  dialogProps: ShareChatDialogProps;
};
