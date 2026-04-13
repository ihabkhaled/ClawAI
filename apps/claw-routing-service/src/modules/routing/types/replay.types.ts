import type { ReplayOutcomeLabel } from '../../../common/enums/replay-outcome-label.enum';

export type ReplayResult = {
  caseId?: string;
  messagePreview: string;
  hasOriginalContent: boolean;
  originalDecision: {
    selectedProvider: string;
    selectedModel: string;
    confidence: number | null;
    reasonTags: string[];
    costClass: string | null;
  };
  replayDecision: {
    selectedProvider: string;
    selectedModel: string;
    confidence: number;
    reasonTags: string[];
    costClass: string;
    detectedCategory: string | undefined;
    estimatedCostPer1M: number | undefined;
    latencySlaMs: number | undefined;
  };
  changed: boolean;
  improvementScore: number;
  outcomeLabel: ReplayOutcomeLabel;
  isSuspicious: boolean;
  suspiciousReasons: string[];
};

export type LabelBreakdown = {
  correctImprovement: number;
  badRegression: number;
  costWin: number;
  qualityWin: number;
  uncertain: number;
};

export type ReplayBatchResult = {
  runId?: string;
  totalReplayed: number;
  changed: number;
  unchanged: number;
  averageConfidenceOld: number;
  averageConfidenceNew: number;
  averageImprovementScore: number;
  suspiciousCount: number;
  labelBreakdown: LabelBreakdown;
  results: ReplayResult[];
};

export type ReplayFilters = {
  threadId?: string;
  routingMode?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  saveRun?: boolean;
  runName?: string;
};
