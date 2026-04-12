export type QualityCheckResult = {
  isWeak: boolean;
  reasons: string[];
  score: number;
};

export type ReRoutingDecision = {
  shouldReRoute: boolean;
  reason: string;
  escalationProvider: string | null;
  escalationModel: string | null;
  originalScore: number;
};
