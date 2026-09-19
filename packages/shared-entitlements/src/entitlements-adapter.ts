import type { EntitlementsLookupOptions } from './entitlements-lookup.types';
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

/** Features that are reserved before the work and settled after (F3d, ADR-110). */
export type ReservedFeature = 'FILE_GENERATION';

export type FeatureReservationInput = {
  userId: string;
  feature: ReservedFeature;
  /** Idempotency key: a retry of the same request reuses its reservation. */
  requestId: string;
};

/**
 * auth-service's answer. A null `reservationId` means the caller is not metered
 * (admin, no plan) and has nothing to settle.
 */
export type FeatureReservation =
  | { allowed: true; reservationId: string | null }
  | {
      allowed: false;
      reason: 'FEATURE_DISABLED' | 'FEATURE_TRIAL_EXHAUSTED';
      used: number;
      limit: number;
      window: string | null;
    };

export type FeatureSettlementOutcome = 'CONSUME' | 'RELEASE';

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

  /**
   * The user's entitlements.
   *
   * By default an expired free trial THROWS (`PLAN_TRIAL_EXPIRED`) - that is
   * how chat refuses AI use after a trial and shows the "trial ended" notice.
   *
   * `enforceTrial: false` returns the entitlements of the plan the user has
   * fallen back to instead. Role permissions and the plan's own feature gates
   * are not billing state: with the throw, every PermissionGuard in every
   * service failed closed for a trial-expired user, so memory and context
   * packs - which the Free plan includes - returned 403 to eight production
   * users whose role granted them. Use it anywhere the question is "what may
   * this user do", not "may this user spend AI now".
   */
  async getEntitlements(
    userId: string,
    options: EntitlementsLookupOptions = {},
  ): Promise<UserEntitlements> {
    const query = options.enforceTrial === false ? '?enforceTrial=false' : '';
    return this.requestWithTransportRetry<UserEntitlements>(
      'GET',
      `/api/v1/internal/users/${encodeURIComponent(userId)}/entitlements${query}`,
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

  /** Holds one run of a metered feature before the work starts. */
  async reserveFeatureUsage(input: FeatureReservationInput): Promise<FeatureReservation> {
    return this.request<FeatureReservation>(
      'POST',
      '/api/v1/internal/quota/features/reserve',
      input,
    );
  }

  /** Counts a delivered run, or gives back one whose work failed. */
  async settleFeatureUsage(
    reservationId: string,
    outcome: FeatureSettlementOutcome,
  ): Promise<void> {
    await this.request<undefined>('POST', '/api/v1/internal/quota/features/settle', {
      reservationId,
      outcome,
    });
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
