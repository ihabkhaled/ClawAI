// SCAFFOLD: stream R.8 (09-r8-advanced-intelligence)

export type CostQualityWeight = {
  qualityWeight: number;
  costWeight: number;
};

export type CircuitBreakerTrigger = 'FAILURE_RATE' | 'LATENCY_P95';

export type RegionPreferenceScope = 'USER' | 'ORG' | 'GLOBAL';

export type MultiIntent = {
  intent: string;
  confidence: number;
  routedProvider?: string;
  routedModel?: string;
};

export type ConsensusResult = {
  models: { provider: string; model: string; answer: string; confidence: number }[];
  agreementScore: number;
  winnerIndex: number;
};
