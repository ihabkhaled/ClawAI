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
