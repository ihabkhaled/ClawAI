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

/**
 * True when the request never reached a response.
 *
 * `fetch` reports transport faults as a bare `TypeError` with the real code on
 * `.cause`; anything that produced a status is not one of these, and an abort
 * is the caller's own timeout rather than a fault worth repeating.
 */
function isTransportFailure(error: unknown): boolean {
  if (!(error instanceof Error) || error.name === 'AbortError') {
    return false;
  }
  if (error instanceof EntitlementsRequestError) {
    return false;
  }
  // A non-2xx is thrown as a plain Error with this prefix by `request`; the
  // server answered, so it is not a transport failure.
  return !error.message.startsWith('Entitlements request failed:');
}

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
    return this.requestWithTransportRetry<UserEntitlements>(
      'GET',
      `/api/v1/internal/users/${encodeURIComponent(userId)}/entitlements`,
    );
  }

  /**
   * One retry, and only for a connection that never carried a response.
   *
   * Every service resolves entitlements on the hot path with no cache, so a
   * momentary transport fault becomes a user-visible 503 on writes that would
   * otherwise have succeeded. The common cause is an upstream restart: keep-
   * alive sockets pooled against the old process fail once each as they are
   * discovered dead, in a burst, and then everything is fine again — which is
   * exactly the intermittent shape that was reported.
   *
   * Deliberately narrow. Only a transport failure retries: an HTTP response of
   * any status means auth-service answered and its answer stands, and only a
   * GET is retried because it is the sole idempotent call here. Reserving or
   * finalizing quota must never be retried blindly — that would double-charge.
   */
  private async requestWithTransportRetry<T>(method: string, path: string): Promise<T> {
    try {
      return await this.request<T>(method, path);
    } catch (error: unknown) {
      if (!isTransportFailure(error)) {
        throw error;
      }
      return this.request<T>(method, path);
    }
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
