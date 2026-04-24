import { useState } from 'react';

import type { AiActionKind } from '../../enums/ai-action-kind.enum';
import type { WorkspaceActionType } from '../../enums/workspace-action-type.enum';
import { WorkspaceObjectType } from '../../enums/workspace-object-type.enum';
import { WorkspaceProvider } from '../../enums/workspace-provider.enum';
import type { UseGmailPageResult } from '../../types/gmail.types';
import type { WorkspaceObject } from '../../types/workspace.types';

import { useCreateWorkspaceAction } from './use-workspace-action-mutations';
import { useWorkspaceConnectors } from './use-workspace-connectors';
import { useWorkspaceObjects } from './use-workspace-objects';

export function useGmailPage(): UseGmailPageResult {
  const { data: connectorsData } = useWorkspaceConnectors({ provider: WorkspaceProvider.GMAIL });
  const connector = connectorsData?.data?.[0];

  const {
    data: messagesData,
    isLoading,
    isError,
  } = useWorkspaceObjects(
    connector !== undefined
      ? { connectorId: connector.id, type: WorkspaceObjectType.EMAIL }
      : undefined,
  );

  const [selectedMessage, setSelectedMessage] = useState<WorkspaceObject | null>(null);
  const [aiDialogKind, setAiDialogKind] = useState<AiActionKind | null>(null);
  const { mutate: createAction, isPending: isDraftPending } = useCreateWorkspaceAction();

  const handleSelectMessage = (msg: WorkspaceObject): void => {
    setSelectedMessage(msg);
  };

  const handleCloseDialog = (): void => {
    setSelectedMessage(null);
  };

  const handleOpenAiAction = (kind: AiActionKind): void => {
    setAiDialogKind(kind);
  };

  const handleCloseAiAction = (): void => {
    setAiDialogKind(null);
  };

  const handleCreateAction = (
    actionType: WorkspaceActionType,
    payload: Record<string, unknown>,
  ): void => {
    if (connector === undefined) {
      return;
    }
    createAction({ connectorId: connector.id, actionType, payload });
  };

  return {
    connector,
    messages: messagesData?.data ?? [],
    isLoading,
    isError,
    selectedMessage,
    aiDialogKind,
    handleSelectMessage,
    handleCloseDialog,
    handleOpenAiAction,
    handleCloseAiAction,
    handleCreateAction,
    isDraftPending,
  };
}
