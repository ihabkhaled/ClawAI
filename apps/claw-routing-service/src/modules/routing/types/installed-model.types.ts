import type { AdaptiveLearningInsights } from './adaptive-learning.types';

export type InstalledModelInfo = {
  name: string;
  tag: string;
  category: string | null;
  roles: string[];
  capabilities: string[];
  parameterCount: string | null;
  sizeBytes?: number | null;
};

export type InstalledModelsResponse = {
  models: InstalledModelInfo[];
};

export type CachedPromptData = {
  prompt: string;
  generatedAt: number;
};

export type RouterRoutingSignals = {
  providerLatencyMs?: Record<string, number>;
  providerCircuitOpenUntil?: Record<string, number>;
  localDegradeLatencyMs?: number;
  latencyPenaltyStepMs?: number;
};

export type CachedInsightsData = {
  insights: AdaptiveLearningInsights;
  generatedAt: number;
  ttlMs: number;
};
