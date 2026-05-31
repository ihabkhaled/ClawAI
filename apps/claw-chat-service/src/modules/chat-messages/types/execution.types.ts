import type { TokenLedgerContext, TokenUsageSource } from '@claw/shared-types';
import type { AttemptRecord } from './fallback-executor.types';
import type { JudgeRefereeMetadata } from './judge-referee.types';
import type { AnthropicMessage } from './anthropic-message-shape.types';
import type { GeminiContent } from './gemini.types';

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
  // Phase 6 — workflow live wiring. Null when the routing-service was
  // built before Phase 6, so consumers MUST tolerate `undefined` and
  // fall back to DIRECT_LLM execution (backward compatible).
  selectedWorkflow?: string | null;
  workflowReason?: string | null;
};

export type LlmResponse = {
  content: string;
  provider: string;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  // Feature 2 — token usage transparency. Every model call now produces a
  // complete usage with a fallback estimate when the provider omits native
  // counts. `tokenEstimated` is true when at least one side was estimated,
  // `tokenSource` records NATIVE / ESTIMATED / MIXED, and `tokenContext` tags
  // which call path produced the usage (CHAT, REGENERATE, COMPARE, JUDGE, …).
  tokenEstimated?: boolean;
  tokenSource?: TokenUsageSource;
  tokenContext?: TokenLedgerContext;
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
  // Phase 6 — workflow live wiring. Set on every assistant response so the
  // FE can render the workflow badge ("Search-first" / "Direct"). Null when
  // the routing decision did NOT carry a workflow selection (legacy / v1).
  workflow?: string | null;
  workflowReason?: string | null;
  // Set only when SEARCH_FIRST attempted to run; carries the outcome
  // (applied, fallback reason, result count, runId for trace).
  searchFirst?: {
    applied: boolean;
    resultCount: number;
    runId: string | null;
    warning: string | null;
  };
  // Phase 5 — per-attempt records (provider/model/duration/status/error)
  // for the FE developer drawer. Empty array when the message succeeded
  // on the very first try with no quality re-route.
  attempts?: AttemptRecord[];
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

// Native Ollama /api/chat message shape — content is a plain string and any
// attached images travel on a sibling `images` array carrying raw base64
// payloads (no `data:` prefix). This differs from the OpenAI shape where
// images ride inside content as `image_url` parts.
export type OllamaChatMessage = {
  role: string;
  content: string;
  images?: string[];
};

export type OllamaChatRequest = {
  model: string;
  messages: OllamaChatMessage[];
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
  // Asks OpenAI-compatible providers to include a final usage chunk while
  // streaming (token totals). Ignored by providers that don't support it.
  stream_options?: { include_usage: boolean };
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

// Slice D — Anthropic native Messages API request body shape (when
// ENABLE_ANTHROPIC_NATIVE_PDF is on). Anthropic's native endpoint expects
// `system` as a top-level string and per-message `content` as either a
// string or a discriminated content-block array.
export type AnthropicMessagesRequest = {
  model: string;
  messages: AnthropicMessage[];
  stream: boolean;
  system?: string;
  temperature?: number;
  max_tokens?: number;
};

// Slice D — Gemini native generateContent request body shape (when
// ENABLE_GEMINI_FILES_API is on). Gemini expects `contents` (not
// `messages`), with each `content` carrying typed `parts`.
export type GeminiNativeChatRequest = {
  model: string;
  contents: GeminiContent[];
  stream: boolean;
  systemInstruction?: { parts: Array<{ text: string }> };
  generationConfig?: {
    temperature?: number;
    maxOutputTokens?: number;
  };
};
