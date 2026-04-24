import type { AiActionKind } from '../enums/ai-action-kind.enum';
import type { WorkspaceActionType } from '../enums/workspace-action-type.enum';

import type { WorkspaceConnector, WorkspaceObject } from './workspace.types';

export type PullRequestMetadata = {
  number: number | null;
  state: string;
  author: string;
  sourceBranch: string;
  targetBranch: string;
  reviewers: string[];
  additions: number | null;
  deletions: number | null;
  labels: string[];
  isDraft: boolean;
  reviewState: string | null;
};

export type UseSourceControlPageResult = {
  connector: WorkspaceConnector | undefined;
  pullRequests: WorkspaceObject[];
  isLoading: boolean;
  isError: boolean;
  selectedPr: WorkspaceObject | null;
  aiDialogKind: AiActionKind | null;
  handleSelectPr: (pr: WorkspaceObject) => void;
  handleCloseDialog: () => void;
  handleOpenAiAction: (kind: AiActionKind) => void;
  handleCloseAiAction: () => void;
  handleCreateAction: (actionType: WorkspaceActionType, payload: Record<string, unknown>) => void;
  isDraftPending: boolean;
};
