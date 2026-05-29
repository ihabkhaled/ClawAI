import type { TokenUsage, UserTokenQuotaSummary } from './token-usage.type';

export type CompareModelError = {
  code: string;
  messageKey?: string;
  message?: string;
};

export type CompareModelResult = {
  resultId: string;
  provider: string;
  model: string;
  content: string;
  latencyMs: number;
  tokenUsage: TokenUsage;
  quotaAfterResult?: UserTokenQuotaSummary;
  error?: CompareModelError;
};
