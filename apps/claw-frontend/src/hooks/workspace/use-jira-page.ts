import { useState } from 'react';

import type { AiActionKind } from '../../enums/ai-action-kind.enum';
import type { WorkspaceActionType } from '../../enums/workspace-action-type.enum';
import { WorkspaceObjectType } from '../../enums/workspace-object-type.enum';
import { WorkspaceProvider } from '../../enums/workspace-provider.enum';
import type { UseJiraPageResult } from '../../types/jira.types';
import type { WorkspaceObject } from '../../types/workspace.types';

import { useCreateWorkspaceAction } from './use-workspace-action-mutations';
import { useWorkspaceConnectors } from './use-workspace-connectors';
import { useWorkspaceObjects } from './use-workspace-objects';

export function useJiraPage(): UseJiraPageResult {
  const { data: connectorsData } = useWorkspaceConnectors({ provider: WorkspaceProvider.JIRA });
  const connector = connectorsData?.data?.[0];

  const {
    data: ticketsData,
    isLoading,
    isError,
  } = useWorkspaceObjects(
    connector !== undefined
      ? { connectorId: connector.id, type: WorkspaceObjectType.TICKET }
      : undefined,
  );

  const [selectedTicket, setSelectedTicket] = useState<WorkspaceObject | null>(null);
  const [aiDialogKind, setAiDialogKind] = useState<AiActionKind | null>(null);
  const { mutate: createAction, isPending: isDraftPending } = useCreateWorkspaceAction();

  const handleSelectTicket = (ticket: WorkspaceObject): void => {
    setSelectedTicket(ticket);
  };

  const handleCloseDialog = (): void => {
    setSelectedTicket(null);
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
    tickets: ticketsData?.data ?? [],
    isLoading,
    isError,
    selectedTicket,
    aiDialogKind,
    handleSelectTicket,
    handleCloseDialog,
    handleOpenAiAction,
    handleCloseAiAction,
    handleCreateAction,
    isDraftPending,
  };
}
