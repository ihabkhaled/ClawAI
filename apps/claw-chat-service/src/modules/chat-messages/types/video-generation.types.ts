/** The body chat-service sends to image-service's internal video route (ADR-137). */
export type VideoGenerateRequest = {
  prompt: string;
  provider: string;
  model: string;
  userId: string;
  isAutoMode: boolean;
  durationSeconds: number;
  aspectRatio: string;
  threadId?: string;
  userMessageId?: string;
  /** The user's own words when `prompt` was rewritten by the planner. */
  originalPrompt?: string;
};

export type VideoGenerateResponse = {
  generationId: string;
  status: string;
  provider: string;
  model: string;
};
