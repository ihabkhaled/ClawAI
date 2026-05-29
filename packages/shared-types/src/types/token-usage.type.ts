import type { TokenEstimatorKind } from '../enums/token-estimator-kind.enum';
import type { TokenUsageSource } from '../enums/token-usage-source.enum';

export type TokenUsage = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
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
