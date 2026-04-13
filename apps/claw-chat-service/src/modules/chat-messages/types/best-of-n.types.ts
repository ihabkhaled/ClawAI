export type CandidateResult = {
  content: string;
  provider: string;
  model: string;
  latencyMs: number;
  qualityScore: number;
  qualityReasons: string[];
  rank: number;
};

export type BestOfNResponse = {
  messageId: string;
  threadId: string;
};
