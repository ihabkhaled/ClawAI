import type { JudgeRefereeMetadata } from './judge-referee.types';

export type RouteRoadmapStep = {
  stage: 'router' | 'decision' | 'research' | 'tool' | 'execution' | 'fallback';
  provider: string;
  model: string;
  displayName?: string | null;
  description?: string | null;
};

export type ResearchExecutionSummary = {
  runId: string;
  workflow: string;
  toolsUsed: string[];
  helperModels: string[];
  itemCount: number;
  warningCount: number;
};

export type StoredProgressSummaryStep = {
  label: string;
  description?: string | null;
  actorType: 'request' | 'router' | 'model' | 'judge' | 'system';
  actorName?: string | null;
  status: 'completed' | 'error';
};

export type RouteRoadmap = {
  routingMode: string;
  routerModel: string | null;
  selectedProvider: string;
  selectedModel: string;
  finalProvider: string;
  finalModel: string;
  finalDisplayName?: string | null;
  steps: RouteRoadmapStep[];
  research?: ResearchExecutionSummary | null;
};

export type MessageRoutedData = {
  messageId: string;
  threadId: string;
  selectedProvider: string;
  selectedModel: string;
  routingMode: string;
  routerModel?: string | null;
  fallbackProvider?: string;
  fallbackModel?: string;
  fallbackChain?: Array<{ provider: string; model: string }>;
  routeRoadmap?: RouteRoadmap;
  timestamp: string;
  detectedCategory?: string;
  judgeEnabled?: boolean;
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
  imageGenerationId?: string;
  fileGenerationId?: string;
  reRouted?: boolean;
  originalProvider?: string;
  originalModel?: string;
  originalScore?: number;
  reRouteAttempts?: number;
  reRouteReasons?: string[];
  judgeRefereeMetadata?: JudgeRefereeMetadata;
  fastPathUsed?: boolean;
  fastPathEscalated?: boolean;
  executionPath?: 'fast' | 'standard' | 'fast_escalated';
  targetLatencyMs?: number;
};

export type OllamaGenerateRequest = {
  model: string;
  prompt: string;
  stream?: boolean;
  think?: boolean;
  keep_alive?: string;
  images?: string[];
  options?: {
    temperature?: number;
    num_predict?: number;
  };
};

export type OllamaGenerateResponse = {
  model: string;
  createdAt: string;
  response: string;
  thinking?: string;
  done: boolean;
  totalDuration?: number;
  loadDuration?: number;
  promptEvalCount?: number;
  evalCount?: number;
  evalDuration?: number;
};

export type OllamaChatRequest = {
  model: string;
  messages: OpenAiChatMessage[];
  stream: boolean;
  options?: {
    temperature?: number;
    num_predict?: number;
  };
};

export type OllamaChatResponse = {
  model: string;
  created_at?: string;
  message?: {
    role?: string;
    content?: string;
  };
  done?: boolean;
  done_reason?: string;
  prompt_eval_count?: number;
  eval_count?: number;
};

export type OpenAiImageContent = {
  type: 'image_url';
  image_url: { url: string };
};

export type OpenAiTextContent = {
  type: 'text';
  text: string;
};

export type OpenAiContentPart = OpenAiTextContent | OpenAiImageContent;

export type OpenAiChatMessage = {
  role: string;
  content: string | OpenAiContentPart[];
};

export type OpenAiChatRequest = {
  model: string;
  messages: OpenAiChatMessage[];
  stream: boolean;
  temperature?: number;
  max_tokens?: number;
};

export type ThreadSettings = {
  systemPrompt?: string | null;
  temperature?: number | null;
  maxTokens?: number | null;
  judgeModel?: string | null;
  qualityThreshold?: number | null;
  maxReRouteAttempts?: number | null;
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

export type FallbackAttemptData = {
  failedProvider: string;
  failedModel: string;
  error: string;
  attempt: number;
  totalCandidates: number;
  nextProvider?: string;
  nextModel?: string;
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

export type ImageGenerateResponse = {
  generationId: string;
  status: string;
  provider: string;
  model: string;
};

export type FileGenerateResponse = {
  generationId: string;
  status: string;
  format: string;
};
