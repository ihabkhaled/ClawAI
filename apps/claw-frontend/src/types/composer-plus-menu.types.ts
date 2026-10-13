import type { LucideIcon } from 'lucide-react';
import type { KeyboardEvent, ReactNode, RefObject } from 'react';

import type { ComposerPlusMenuView } from '@/enums/composer-plus-menu-view.enum';
import type { UseComposerContextMenuReturn } from '@/types/composer-context.types';
import type { PromptLibraryDialogProps } from '@/types/prompt-library.types';
import type { ResearchOptions, SanitizedResearchProvider } from '@/types/research.types';

/** What the "+" menu needs from the toolbar; each field mirrors the ComposerToolbarProps one. */
export type ComposerPlusMenuProps = {
  disabled: boolean;
  selectedFileIds: string[];
  onSelectedFileIdsChange: (ids: string[]) => void;
  ingestFiles: (files: FileList | File[]) => void;
  isUploadingAttachment: boolean;
  canResearch: boolean;
  research: ResearchOptions;
  onResearchChange: (value: ResearchOptions) => void;
  researchProviders: SanitizedResearchProvider[];
  isResearchProvidersLoading: boolean;
  /** Null on the new-chat surface, where there is no thread to hold packs or memory. */
  threadId: string | null;
  draft: string;
  onInsertPrompt: (text: string) => void;
};

export type UseComposerPlusMenuKeyboardReturn = {
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
  /** Opening lands on the menu itself rather than the search box. */
  onOpenAutoFocus: (event: Event) => void;
};

export type UseComposerPlusMenuReturn = UseComposerPlusMenuKeyboardReturn & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  closeMenu: () => void;
  view: ComposerPlusMenuView;
  showView: (view: ComposerPlusMenuView) => void;
  backToMain: () => void;
  contentRef: RefObject<HTMLDivElement | null>;
  /** Bag for the prompt-library dialog, which lives outside the menu so it survives it closing. */
  prompts: PromptLibraryDialogProps;
  openPrompts: () => void;
  previewOpen: boolean;
  onPreviewOpenChange: (open: boolean) => void;
  openPreview: () => void;
  /** Browse all: its dialog lives outside the popover too, so closing the menu keeps it. */
  libraryOpen: boolean;
  onLibraryOpenChange: (open: boolean) => void;
  openLibrary: () => void;
};

export type ComposerPlusMenuViewProps = ComposerPlusMenuProps & {
  menu: UseComposerPlusMenuReturn;
  /** Null on the new-chat surface, where there is no thread to hold packs or memory. */
  context: UseComposerContextMenuReturn | null;
};

/** The "+" menu on a thread: the view's props minus the context the host itself supplies. */
export type ComposerPlusMenuContextHostProps = Omit<ComposerPlusMenuViewProps, 'context'> & {
  threadId: string;
};

export type ComposerPlusMenuItemProps = {
  icon: LucideIcon;
  label: string;
  hint?: string;
  /** Replaces the trailing chevron, e.g. the current research mode. */
  trailing?: ReactNode;
  /** Draws a chevron: the row opens a sub-panel rather than acting. */
  opensPanel?: boolean;
  /** Names the sub-panel so Back returns focus to this row. */
  returnKey?: ComposerPlusMenuView;
  disabled?: boolean;
  onClick: () => void;
  dataTour?: string;
};

export type ComposerPlusMenuSectionProps = {
  title: string;
  children: ReactNode;
};

export type ComposerPlusSubPanelProps = {
  title: string;
  onBack: () => void;
  children: ReactNode;
};

export type ComposerResearchPanelProps = {
  value: ResearchOptions;
  providers: SanitizedResearchProvider[];
  isProvidersLoading: boolean;
  onChange: (value: ResearchOptions) => void;
  disabled: boolean;
};

export type ComposerResearchChipProps = ComposerResearchPanelProps;

export type UseComposerResearchChipReturn = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPanelChange: (value: ResearchOptions) => void;
};

export type PreviewContextDialogProps = {
  threadId: string;
  draft: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};
