// HighRiskDetector — Phase 7 of the semantic router flagship.
// Output shape returned by detectHighRisk().

export type HighRiskSignal = {
  isHighRisk: boolean;
  matchedKeywords: string[];
  analyzerRiskLevel?: string | null;
};
