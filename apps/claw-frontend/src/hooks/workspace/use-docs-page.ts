import { useState } from 'react';

import { DOCS_PROVIDERS } from '../../constants/docs.constants';
import type { AiActionKind } from '../../enums/ai-action-kind.enum';
import type { WorkspaceActionType } from '../../enums/workspace-action-type.enum';
import { WorkspaceObjectType } from '../../enums/workspace-object-type.enum';
import type { UseDocsPageResult } from '../../types/docs.types';
import type { WorkspaceObject } from '../../types/workspace.types';

import { useCreateWorkspaceAction } from './use-workspace-action-mutations';
import { useWorkspaceConnectors } from './use-workspace-connectors';
import { useWorkspaceObjects } from './use-workspace-objects';

export function useDocsPage(): UseDocsPageResult {
  const { data: connectorsData } = useWorkspaceConnectors();
  const connector = connectorsData?.data?.find((c) => DOCS_PROVIDERS.includes(c.provider));

  const {
    data: docsData,
    isLoading,
    isError,
  } = useWorkspaceObjects(
    connector !== undefined
      ? { connectorId: connector.id, type: WorkspaceObjectType.DOCUMENT }
      : undefined,
  );

  const [selectedDoc, setSelectedDoc] = useState<WorkspaceObject | null>(null);
  const [aiDialogKind, setAiDialogKind] = useState<AiActionKind | null>(null);
  const { mutate: createAction, isPending: isDraftPending } = useCreateWorkspaceAction();

  const handleSelectDoc = (doc: WorkspaceObject): void => {
    setSelectedDoc(doc);
  };

  const handleCloseDialog = (): void => {
    setSelectedDoc(null);
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
    docs: docsData?.data ?? [],
    isLoading,
    isError,
    selectedDoc,
    aiDialogKind,
    handleSelectDoc,
    handleCloseDialog,
    handleOpenAiAction,
    handleCloseAiAction,
    handleCreateAction,
    isDraftPending,
  };
}
