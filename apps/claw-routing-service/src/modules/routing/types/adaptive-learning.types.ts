export type ProviderInsight = {
  provider: string;
  totalDecisions: number;
  fallbackCount: number;
  fallbackRate: number;
  avgConfidence: number;
  topModes: string[];
};

export type ModeInsight = {
  routingMode: string;
  count: number;
  percentage: number;
  avgConfidence: number;
};

export type AdaptiveLearningInsights = {
  windowDays: number;
  totalDecisions: number;
  providerInsights: ProviderInsight[];
  modeInsights: ModeInsight[];
  avgConfidence: number;
  topReasonTags: string[];
};
