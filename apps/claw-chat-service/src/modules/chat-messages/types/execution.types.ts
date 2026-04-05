export type MessageRoutedData = {
  messageId: string;
  threadId: string;
  selectedProvider: string;
  selectedModel: string;
  routingMode: string;
  fallbackProvider?: string;
  fallbackModel?: string;
  timestamp: string;
};

export type LlmResponse = {
  content: string;
  provider: string;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  latencyMs: number;
  finishReason?: string;
  usedFallback: boolean;
};

export type OllamaGenerateRequest = {
  model: string;
  prompt: string;
  stream?: boolean;
};

export type OllamaGenerateResponse = {
  model: string;
  createdAt: string;
  response: string;
  done: boolean;
  totalDuration?: number;
  loadDuration?: number;
  promptEvalCount?: number;
  evalCount?: number;
  evalDuration?: number;
};

export type OpenAiChatMessage = {
  role: string;
  content: string;
};

export type OpenAiChatRequest = {
  model: string;
  messages: OpenAiChatMessage[];
  stream: boolean;
};

export type OpenAiChatChoice = {
  index: number;
  message: OpenAiChatMessage;
  finish_reason: string;
};

export type OpenAiChatUsage = {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
};

export type OpenAiChatResponse = {
  id: string;
  choices: OpenAiChatChoice[];
  usage?: OpenAiChatUsage;
};

export type ConnectorConfigResponse = {
  provider: string;
  apiKey: string;
  baseUrl?: string;
  region?: string;
};

export type CreateAssistantMessageData = {
  threadId: string;
  content: string;
  provider: string;
  model: string;
  routingMode: string;
  inputTokens?: number;
  outputTokens?: number;
  latencyMs: number;
  usedFallback: boolean;
};
