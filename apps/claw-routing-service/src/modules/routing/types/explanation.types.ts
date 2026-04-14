export type ExplanationFactor = {
  factor: string;
  value: string;
  weight: 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
};

export type RejectedEntry = {
  provider: string;
  reason: string;
};

export type RoutingExplanation = {
  summary: string;
  factors: ExplanationFactor[];
  rejected: RejectedEntry[];
};
