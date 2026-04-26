export type InternalGenerateRequest = {
  provider: string;
  model: string;
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
};

export type InternalGenerateResponse = {
  content: string;
  provider: string;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  durationMs: number;
};
