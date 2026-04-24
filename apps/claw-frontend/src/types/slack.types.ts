import type { AiActionKind } from '../enums/ai-action-kind.enum';
import type { WorkspaceActionType } from '../enums/workspace-action-type.enum';

import type { WorkspaceConnector, WorkspaceObject } from './workspace.types';

export type SlackMessageMetadata = {
  channelName: string;
  senderName: string;
  threadTs: string | null;
  isThreadReply: boolean;
  reactions: string[];
  hasAttachments: boolean;
};

export type UseSlackPageResult = {
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
