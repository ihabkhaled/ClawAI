export type CostTier = 'single' | 'duo' | 'trio';

export type CostClassification = {
  tier: CostTier;
  complexity: number;
  risk: number;
  ambiguity: number;
  reasoning: string;
};

export type EnsembleCandidate = {
  model: string;
  response: string;
  latencyMs: number;
};

export type CostEnsembleResponse = {
  messageId: string;
  threadId: string;
};

export type RawClassification = {
  complexity: number;
  risk: number;
  ambiguity: number;
  reasoning: string;
};
