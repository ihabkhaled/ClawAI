import type {
  AiActionKind,
  AiActionMode,
  AiActionPrivacyClass,
} from '../../../common/enums/ai-action-kind.enum';

export type ModelChoice = {
  provider: string;
  model: string;
  displayName: string;
};

export type AutoRouterResolution = {
  primary: ModelChoice;
  fallbackChain: ModelChoice[];
  mode: AiActionMode;
};

export type AiActionRequest = {
  actionKind: AiActionKind;
  privacyClass: AiActionPrivacyClass;
  context: string;
  preferredModel?: ModelChoice;
  options?: Record<string, unknown>;
};

export type AiActionGeneratedBy = {
  provider: string;
  model: string;
  displayName: string;
  mode: AiActionMode;
  fallbackChain?: ModelChoice[];
};

export type AiActionResult = {
  content: string;
  generatedBy: AiActionGeneratedBy;
  durationMs: number;
  inputTokens?: number;
  outputTokens?: number;
};

export type RunAiActionInput = {
  actionKind: AiActionKind;
  privacyClass: AiActionPrivacyClass;
  context: string;
  preferredModel?: ModelChoice;
};

export type BuiltAiActionPrompt = {
  systemPrompt: string;
  userPrompt: string;
};

export type OllamaGenerateInput = {
  baseUrl: string;
  model: string;
  prompt: string;
  timeoutMs: number;
};

export type OllamaGenerateOutput = {
  content: string;
  totalDurationMs: number;
  promptEvalCount?: number;
  evalCount?: number;
};

export type RawGenerateResponse = {
  response?: string;
  totalDuration?: number;
  total_duration?: number;
  promptEvalCount?: number;
  prompt_eval_count?: number;
  evalCount?: number;
  eval_count?: number;
};

export type CloudGenerateInput = {
  chatServiceUrl: string;
  provider: string;
  model: string;
  systemPrompt: string;
  userPrompt: string;
  timeoutMs: number;
};

export type CloudGenerateOutput = {
  content: string;
  inputTokens?: number;
  outputTokens?: number;
};

export type ChatInternalResponse = {
  content: string;
  provider: string;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  durationMs: number;
};
