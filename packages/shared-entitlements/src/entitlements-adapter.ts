import type { UserEntitlements } from './types';

export class EntitlementsRequestError extends Error {
  constructor(
    public readonly status: number,
    public readonly errorCode: string,
  ) {
    super(`Entitlements request failed with ${errorCode}`);
    this.name = 'EntitlementsRequestError';
  }
}

export type EntitlementsAdapterOptions = {
  // Base URL of the auth-service, e.g. https://auth-service:4001
  authServiceUrl: string;
  // Per-resolve timeout (ms).
  timeoutMs?: number;
};

export type QuotaReserveResult =
  | { ok: true; reservationId: string; estimate: number }
  | {
      ok: false;
      reason: 'QUOTA_EXCEEDED';
      snapshot: { dailyLimit: number; used: number; remaining: number };
    };

export type QuotaFinalizeInput = {
  userId: string;
  planId: string | null;
  estimatedTokens: number;
  inputTokens: number;
  outputTokens: number;
  provider: string;
  model: string;
};

export type ResearchUsageFeature = 'WEB_SEARCH' | 'WEB_FETCH' | 'WEB_EXTRACT';

export type FeatureUsageInput = {
  userId: string;
  feature: ResearchUsageFeature;
  requestId: string;
};

// Thin client over the auth-service internal entitlement + quota endpoints.
// Fetches fresh per call (no stale cache) so a plan/role change applies on the
// very next request — the user's stated requirement. Framework-agnostic; it
// only needs global fetch (Node 20+).
export class EntitlementsAdapter {
  private readonly authServiceUrl: string;
  private readonly timeoutMs: number;

  constructor(options: EntitlementsAdapterOptions) {
    // Strip trailing slashes with a linear scan instead of a backtracking regex.
    // /\/+$/ is a polynomial-ReDoS pattern on uncontrolled input (CodeQL alert
    // #25); a single reverse walk is O(n) and cannot backtrack.
    let end = options.authServiceUrl.length;
    while (end > 0 && options.authServiceUrl[end - 1] === '/') {
      end -= 1;
    }
    this.authServiceUrl = options.authServiceUrl.slice(0, end);
    this.timeoutMs = options.timeoutMs ?? 5000;
  }

  async getEntitlements(userId: string): Promise<UserEntitlements> {
    return this.request<UserEntitlements>(
      'GET',
      `/api/v1/internal/users/${encodeURIComponent(userId)}/entitlements`,
    );
  }

  async reserveQuota(userId: string, estimatedTokens: number): Promise<QuotaReserveResult> {
    return this.request<QuotaReserveResult>('POST', '/api/v1/internal/quota/reserve', {
      userId,
      estimatedTokens,
    });
  }

  async finalizeQuota(input: QuotaFinalizeInput): Promise<void> {
    await this.request<undefined>('POST', '/api/v1/internal/quota/finalize', input);
  }

  async releaseQuota(userId: string, estimatedTokens: number): Promise<void> {
    await this.request<undefined>('POST', '/api/v1/internal/quota/release', {
      userId,
      estimatedTokens,
    });
  }

  async recordFeatureUsage(input: FeatureUsageInput): Promise<void> {
    await this.request<undefined>('POST', '/api/v1/internal/quota/features/consume', input);
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await fetch(`${this.authServiceUrl}${path}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });
      if (!response.ok) {
        const payload: unknown = await response.json().catch(() => null);
        if (
          typeof payload === 'object' &&
          payload !== null &&
          ('errorCode' in payload || 'code' in payload)
        ) {
          const code = 'errorCode' in payload ? payload.errorCode : payload.code;
          if (code === 'PLAN_TRIAL_EXPIRED' || code === 'PLAN_TRIAL_ALREADY_USED') {
            throw new EntitlementsRequestError(response.status, code);
          }
        }
        throw new Error(
          `Entitlements request failed: ${method} ${path} → ${String(response.status)}`,
        );
      }
      if (response.status === 204) {
        return undefined as T;
      }
      return (await response.json()) as T;
    } finally {
      clearTimeout(timer);
    }
  }
}
