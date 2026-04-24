export type RetryPolicyConfig = {
  baseMs: number;
  jitterMs: number;
  maxAttempts: number;
};
