import type { ComposerContextDialog } from '@/enums/composer-context-dialog.enum';
import type { SaveToContextTarget } from '@/enums/save-to-context-target.enum';

import type { ChatThread } from './chat.types';
import type { ContextPack } from './context-pack.types';
import type { RetrievalBundle, RetrievalPackEntry } from './context-receipt.types';

/** The three context controls in the composer toolbar share these. */
export type ComposerContextControlProps = {
  threadId: string;
  /** The text typed so far, so a preview is for the message about to be sent. */
  draft: string;
  disabled: boolean;
};

export type UseComposerContextPacksReturn = {
  packs: ContextPack[];
  isLoading: boolean;
  selectedIds: string[];
  selectedCount: number;
  atLimit: boolean;
  isSaving: boolean;
  toggle: (packId: string) => void;
};

/** One pack's items, as the next message would carry them. */
export type ComposerPackGroup = {
  packId: string;
  name: string;
  items: RetrievalPackEntry[];
};

export type UseComposerContextPreviewReturn = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isLoading: boolean;
  isError: boolean;
  bundle: RetrievalBundle | null;
  packGroups: ComposerPackGroup[];
  /** The thread's own switches; undefined until the thread has loaded. */
  thread: ChatThread | null;
  useMemory: boolean;
  useContext: boolean;
};

export type SaveMessageToContextRequest = {
  target: SaveToContextTarget;
  /** An existing pack to add to; absent means a new pack. Packs only. */
  packId?: string;
};

export type MessageSaveActionProps = {
  messageId: string;
  threadId: string;
};

export type UseMessageSaveActionReturn = {
  save: (target: SaveToContextTarget, packId?: string) => void;
  isPending: boolean;
};

export type UseComposerContextMenuReturn = {
  picker: UseComposerContextPacksReturn;
  preview: UseComposerContextPreviewReturn;
  menuOpen: boolean;
  onMenuOpenChange: (open: boolean) => void;
  dialog: ComposerContextDialog | null;
  /** Closes the menu and opens the chosen dialog, asking for a fresh preview. */
  openDialog: (target: ComposerContextDialog) => void;
  closeDialog: () => void;
};

export type ComposerContextPackListProps = {
  picker: UseComposerContextPacksReturn;
};

/** A read-only dialog driven by the shared menu hook. */
export type ComposerContextDialogProps = {
  preview: UseComposerContextPreviewReturn;
  open: boolean;
  onClose: () => void;
};

/** A surface with no thread yet owns the pack choice and passes it in. */
export type UseDraftContextPacksParams = {
  selectedIds: string[];
  onChange: (next: string[]) => void;
};

/** What a lab's Context button needs: the packs the next run will carry. */
export type OrchestrationContextButtonProps = {
  selectedIds: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
};

/** Ready-to-spread request fragment; empty when no pack is picked. */
export type OrchestrationContextPackPayload = {
  contextPackIds?: string[];
};
