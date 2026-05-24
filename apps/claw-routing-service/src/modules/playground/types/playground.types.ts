// SCAFFOLD: stream R.5 (06-r5-operator-playground)

export type ScoreBreakdown = {
  provider: string;
  model: string;
  scores: {
    quality: number;
    cost: number;
    latency: number;
    privacy: number;
    familiarity: number;
  };
  totalScore: number;
  wasChosen: boolean;
};

export type PlaygroundEvaluationResult = {
  v1Decision: unknown;
  v2Decision?: unknown;
  ollamaRouterDecision?: unknown;
  scoreBreakdown: ScoreBreakdown[];
  candidateList: unknown[];
  modalityResult?: unknown;
  workflowChoice?: unknown;
};
