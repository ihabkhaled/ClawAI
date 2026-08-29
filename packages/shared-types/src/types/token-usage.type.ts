import type { TokenEstimatorKind } from '../enums/token-estimator-kind.enum';
import type { TokenUsageSource } from '../enums/token-usage-source.enum';

export type TokenUsage = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  // Subset of `promptTokens` that the provider served from its prompt cache and
  // bills at a reduced rate. NEVER added on top of `promptTokens` — providers
  // disagree about whether their own field is inclusive, so every extractor
  // normalizes to "promptTokens is the total, this is the discounted part".
  //
  // Priced separately because a cached input token can cost a tenth of a fresh
  // one; treating the whole prompt as fresh over-charges a long conversation.
  cachedPromptTokens: number;
  // Subset of `completionTokens` the model spent thinking rather than
  // answering. On o-series, Gemini thinking and DeepSeek-reasoner this is
  // routinely the LARGER half of the completion and is the single most
  // expensive component of the call.
  //
  // It was hard-coded to 0 everywhere before PAYG credit, so reasoning models
  // were billed at zero on their dominant cost. See ADR-078.
  reasoningTokens: number;
  estimated: boolean;
  source: TokenUsageSource;
  estimator?: TokenEstimatorKind;
};

export type UserTokenQuotaSummary = {
  dailyLimit: number;
  used: number;
  remaining: number;
  unlimited: boolean;
  resetsAt?: string;
};
