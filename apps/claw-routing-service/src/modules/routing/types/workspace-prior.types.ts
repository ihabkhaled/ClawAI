/**
 * V6 learning evolution (ADR-070) — workspace-tier hierarchical personalization.
 */

export type RouterWorkspacePriorRecord = {
  id: string;
  workspaceId: string;
  provider: string;
  model: string;
  taskFamily: string;
  routeCount: number;
  successRate: number;
  confidenceInPrior: number;
  scoreVersion: string | null;
};

export type UpsertWorkspacePriorInput = {
  workspaceId: string;
  provider: string;
  model: string;
  taskFamily: string;
  executionSuccess: boolean;
  scoreVersion?: string | null;
};

/** Result of applying (or declining to apply) a workspace nudge to a decision's confidence. */
export type WorkspacePriorNudgeResult = {
  confidence: number;
  applied: boolean;
};
