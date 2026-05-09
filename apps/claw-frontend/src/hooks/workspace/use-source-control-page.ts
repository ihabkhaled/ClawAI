import { useMemo, useState } from 'react';

import { SOURCE_CONTROL_PROVIDERS } from '../../constants/source-control.constants';
import type { AiActionKind } from '../../enums/ai-action-kind.enum';
import type { WorkspaceActionType } from '../../enums/workspace-action-type.enum';
import { WorkspaceObjectType } from '../../enums/workspace-object-type.enum';
import type { UseSourceControlPageResult } from '../../types/source-control.types';
import type { WorkspaceObject } from '../../types/workspace.types';
import { dedupeWorkspaceObjectsByProviderAndExternalId } from '../../utilities/source-control.utility';

import { useCreateWorkspaceAction } from './use-workspace-action-mutations';
import { useWorkspaceConnectors } from './use-workspace-connectors';
import { useWorkspaceObjects } from './use-workspace-objects';

export function useSourceControlPage(): UseSourceControlPageResult {
  const { data: connectorsData } = useWorkspaceConnectors();
  // We don't pin to a single connector here — the user may have several
  // GitHub/GitLab/Bitbucket connectors (e.g. multiple orgs or test accounts)
  // and PRs land under whichever one synced them. The page just needs to
  // know that at least one source-control connector exists; the PR list is
  // queried unscoped and naturally aggregates across all of them.
  const connector = connectorsData?.data?.find((c) =>
    SOURCE_CONTROL_PROVIDERS.includes(c.provider),
  );

  const {
    data: prsData,
    isLoading,
    isError,
  } = useWorkspaceObjects(
    connector !== undefined ? { type: WorkspaceObjectType.PULL_REQUEST } : undefined,
  );

  // Each connector that synced the same repo gets its own copy of every PR
  // row keyed by (connectorId, externalId). Across connectors that means the
  // same upstream PR can show up N times in the unfiltered list — dedupe by
  // (provider, externalId), keeping whichever copy synced most recently.
  const pullRequests = useMemo(
    () => dedupeWorkspaceObjectsByProviderAndExternalId(prsData?.data ?? []),
    [prsData?.data],
  );

  const [selectedPr, setSelectedPr] = useState<WorkspaceObject | null>(null);
  const [aiDialogKind, setAiDialogKind] = useState<AiActionKind | null>(null);
  const { mutate: createAction, isPending: isDraftPending } = useCreateWorkspaceAction();

  const handleSelectPr = (pr: WorkspaceObject): void => {
    setSelectedPr(pr);
  };

  const handleCloseDialog = (): void => {
    setSelectedPr(null);
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
    pullRequests,
    isLoading,
    isError,
    selectedPr,
    aiDialogKind,
    handleSelectPr,
    handleCloseDialog,
    handleOpenAiAction,
    handleCloseAiAction,
    handleCreateAction,
    isDraftPending,
  };
}
