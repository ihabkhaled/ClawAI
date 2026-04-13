export type VerifierCheckResult = {
  passed: boolean;
  score: number;
  issues: string[];
  suggestions: string[];
};

export type VerifyResponse = {
  messageId: string;
  threadId: string;
};
