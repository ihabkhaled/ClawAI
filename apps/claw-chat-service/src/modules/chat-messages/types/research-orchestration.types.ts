/** Everything the AUTO research loop needs for one user turn. */
export type ResearchOrchestrationInput = {
  userId: string;
  userToken: string;
  threadId: string;
  intent: string;
  providerId?: string;
  forcedProvider?: string;
  forcedModel?: string;
};
