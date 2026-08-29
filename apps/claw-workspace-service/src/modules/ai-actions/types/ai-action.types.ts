import type { PaygSurface } from '@claw/shared-types';

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
  /**
   * The acting user. Two jobs, and the second is why it is no longer optional.
   *
   * Phase 11: whose learned preferences (`AutomationPreferenceService
   * .fetchLearned`) get injected into the prompt.
   *
   * PAYG: whose credit pays for the cloud attempt. This action's fallback chain
   * reaches OpenAI, Anthropic and Gemini through chat-service, where the
   * reservation is taken — so a missing id would be an unmetered paid call.
   * Optional was safe while nothing spent money; it is not any more.
   */
  userId: string;
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
  /**
   * Whose PAYG credit this generation spends.
   *
   * REQUIRED, and never defaulted. Every one of these calls reaches a real paid
   * provider through chat-service, and chat-service is where the reservation is
   * taken — so an absent or invented id here is either an unmetered frontier
   * call or a charge against the wrong wallet. There is no acceptable fallback.
   */
  userId: string;
  /**
   * Which product surface is spending, recorded on the ledger row so
   * "where did my $5 go" is answerable on the billing page.
   */
  surface: PaygSurface;
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

export type RunAiActionEnvelope =
  | { mode: 'EXECUTED'; execution: AiActionResult }
  | {
      mode: 'QUEUED';
      queue: {
        queueId: string;
        status: string;
        riskScore: number;
        riskLabel: string;
        matchedPolicyId: string | null;
        matchedPolicyName: string | null;
      };
    };
