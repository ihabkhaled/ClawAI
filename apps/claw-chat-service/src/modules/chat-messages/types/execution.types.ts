import type { TokenLedgerContext, TokenUsageSource } from '@claw/shared-types';
import type { AttemptRecord } from './fallback-executor.types';
import type { JudgeRefereeMetadata } from './judge-referee.types';
import type { AnthropicMessage } from './anthropic-message-shape.types';
import type { GeminiContent } from './gemini.types';
import type {
  OllamaCloudToolCall,
  OllamaCloudToolDefinition,
  OllamaToolTranscript,
} from './ollama-cloud-tool.types';
import type {
  AnthropicToolChoice,
  AnthropicToolSpec,
  NormalizedToolCall,
  OpenAiToolCallPayload,
  OpenAiToolChoice,
  OpenAiToolSpec,
} from './provider-tool.types';

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
  // Ollama Cloud agentic tool loop transcript. Set only when the assistant
  // turn went through one or more web_search / web_fetch tool calls. The FE
  // renders this as an expandable "Used X web tools" trace under the
  // message bubble.
  toolTranscript?: OllamaToolTranscript;
  // Runtime V2 native tool calling. `toolCalls` carries provider tool calls
  // already reverse-mapped to Runtime tool/version/operation/target identity;
  // `finishedForTools` records that the provider stopped *because* it wanted a
  // tool, which is a normal turn boundary and not an empty response.
  //
  // Both are optional so every existing LlmResponse construction site keeps
  // compiling untouched; absent means "this call carried no tool catalog".
  toolCalls?: readonly NormalizedToolCall[];
  finishedForTools?: boolean;
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
  // Native Ollama generate emits `done_reason` ("stop", "length",
  // "tool_calls", …) alongside `done: true`. We must propagate it so the
  // chat-service can surface ctx-size exhaustion to the FE instead of
  // silently storing a truncated reply as if it had stopped cleanly.
  // Bug-hunt 2026-05-31, Fix 2 (buildOllamaResponse).
  done_reason?: string;
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
//
// `tool_call_id` is set on `role: 'tool'` messages so the model can
// correlate a tool result with the call that produced it (Ollama Cloud
// agentic tool-loop). `tool_calls` is echoed back when we re-POST the
// assistant turn that emitted them — Ollama's docs show clients carry
// the prior assistant.tool_calls into the next request so the loop is
// reproducible.
export type OllamaChatMessage = {
  role: string;
  content: string;
  images?: string[];
  tool_call_id?: string;
  tool_calls?: OllamaCloudToolCall[];
};

export type OllamaChatRequest = {
  model: string;
  messages: OllamaChatMessage[];
  stream: boolean;
  options?: {
    temperature?: number;
    num_predict?: number;
  };
  // Native tool descriptors. Two producers share this field because the wire
  // shape is identical: the built-in web_search / web_fetch descriptors, and
  // the translated Runtime V2 catalog (OpenAiToolSpec — same
  // `{type, function:{name, description, parameters}}` envelope). Non-agentic
  // models ignore the field, so it is safe to pass unconditionally.
  tools?: OllamaCloudToolDefinition[];
};

export type OllamaChatResponse = {
  model: string;
  created_at?: string;
  message?: {
    role?: string;
    content?: string;
    // Ollama Cloud agentic tool-call output. Populated only when the
    // model wants the client to execute a web_search / web_fetch call.
    tool_calls?: OllamaCloudToolCall[];
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
  // Native tool calling. `tool_calls` is echoed back on the assistant turn that
  // requested them; `tool_call_id` correlates a `role: 'tool'` result message
  // to its call. Both are required for a multi-turn tool loop to keep working
  // across the SSE hop where Runtime V2 tools actually execute.
  tool_calls?: OpenAiToolCallPayload[];
  tool_call_id?: string;
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
  tools?: OpenAiToolSpec[];
  tool_choice?: OpenAiToolChoice;
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
  // Anthropic REQUIRES max_tokens on every request, and rejects outright when
  // `tools` is present without it. buildAnthropicMessagesRequestBody supplies a
  // default rather than omitting it whenever a tool catalog is attached.
  max_tokens?: number;
  tools?: AnthropicToolSpec[];
  tool_choice?: AnthropicToolChoice;
};

// Slice D — Gemini native generateContent request body shape (when
// ENABLE_GEMINI_FILES_API is on). Gemini expects `contents` (not
// `messages`), with each `content` carrying typed `parts`.
export type GeminiNativeChatRequest = {
  contents: GeminiContent[];
  systemInstruction?: { parts: Array<{ text: string }> };
  generationConfig?: {
    temperature?: number;
    maxOutputTokens?: number;
  };
};

export type CloudProviderRequestBody =
  OpenAiChatRequest | OllamaChatRequest | AnthropicMessagesRequest | GeminiNativeChatRequest;
