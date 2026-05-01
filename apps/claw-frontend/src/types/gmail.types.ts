import type { AiActionKind } from '../enums/ai-action-kind.enum';
import type { WorkspaceActionType } from '../enums/workspace-action-type.enum';

import type { TranslateFunction } from './i18n.types';
import type { WorkspaceConnector, WorkspaceObject } from './workspace.types';

export type GmailMessageMetadata = {
  subject: string;
  from: string;
  to: string;
  threadId: string;
  labelIds: string[];
  isUnread: boolean;
  snippet: string;
};

export type GmailAttachmentRef = {
  fileServiceFileId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
};

export type GmailRichMetadata = {
  renderedHtml: string | null;
  renderedText: string | null;
  attachmentRefs: GmailAttachmentRef[];
};

export type UseGmailPageResult = {
  connector: WorkspaceConnector | undefined;
  messages: WorkspaceObject[];
  isLoading: boolean;
  isError: boolean;
  selectedMessage: WorkspaceObject | null;
  aiDialogKind: AiActionKind | null;
  handleSelectMessage: (msg: WorkspaceObject) => void;
  handleCloseDialog: () => void;
  handleOpenAiAction: (kind: AiActionKind) => void;
  handleCloseAiAction: () => void;
  handleCreateAction: (actionType: WorkspaceActionType, payload: Record<string, unknown>) => void;
  isDraftPending: boolean;
};


export type UseGmailMessageViewResult = {
  showHtml: boolean;
  setShowHtml: (next: boolean) => void;
  loadImages: boolean;
  setLoadImages: (next: boolean) => void;
};


export type GmailAttachmentListProps = {
  attachments: GmailAttachmentRef[];
  t: TranslateFunction;
};
