export type ReplayResult = {
  messagePreview: string;
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
};

export type ReplayBatchResult = {
  totalReplayed: number;
  changed: number;
  unchanged: number;
  averageConfidenceOld: number;
  averageConfidenceNew: number;
  results: ReplayResult[];
};

export type ReplayFilters = {
  threadId?: string;
  routingMode?: string;
  limit?: number;
};
