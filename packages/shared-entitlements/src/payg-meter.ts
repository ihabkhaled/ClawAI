import { Injectable } from '@nestjs/common';
import {
  CREDIT_INTERNAL_API_BASE,
  PAYG_EXEMPT_PROVIDERS,
  PAYG_RESERVATION_TTL_MS,
} from '@claw/shared-constants';
import { BillingErrorCode } from '@claw/shared-types';

import { PaygCreditExhaustedError } from './payg-credit-exhausted.error';
import {
  type PaygFinalizeCalls,
  type PaygFinalizeUsage,
  type PaygHold,
  type PaygMeterOptions,
  type PaygReleaseReason,
  type PaygReserveInput,
} from './payg-meter.types';

// Response shapes as they arrive off the wire. Narrowed by the guards below
// rather than cast, because an `as` here would let a malformed reply become a
// zero-dollar hold and a free frontier request.
type WireUnmetered = { metered: false; reason: string; maxOutputTokens: number };
type WireMetered = {
  metered: true;
  reservationId: string;
  maxOutputTokens: number;
  clamped: boolean;
  heldMicroUsd: number;
  availableAfterMicroUsd: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isWireMetered(value: unknown): value is WireMetered {
  return (
    isRecord(value) &&
    value['metered'] === true &&
    typeof value['reservationId'] === 'string' &&
    typeof value['maxOutputTokens'] === 'number' &&
    typeof value['heldMicroUsd'] === 'number'
  );
}

function isWireUnmetered(value: unknown): value is WireUnmetered {
  return (
    isRecord(value) && value['metered'] === false && typeof value['maxOutputTokens'] === 'number'
  );
}

function readErrorCode(payload: unknown): BillingErrorCode {
  if (isRecord(payload) && typeof payload['errorCode'] === 'string') {
    return payload['errorCode'] as BillingErrorCode;
  }
  return BillingErrorCode.PAYG_CREDIT_EXHAUSTED;
}

function readNumber(payload: unknown, key: string): number {
  if (isRecord(payload) && typeof payload[key] === 'number') {
    return payload[key];
  }
  return 0;
}

/**
 * The single client every service uses to meter a paid provider call.
 *
 * DELIBERATELY THIN. It calls auth-service and returns the answer. It contains
 * no PAYG classification, no pricing, no thresholds and no wallet arithmetic —
 * all of that lives in auth-service, because a policy compiled into this package
 * ships as six copies inside six `node_modules` directories and can then only be
 * changed by rebuilding six containers (ADR-082). The admin toggle on a
 * connector has to take effect without a deploy, so the decision cannot live
 * here.
 *
 * Usage, at every one of the surfaces that spends money:
 *
 * ```ts
 * const hold = await payg.reserve({ ... });
 * try {
 *   const out = await callProvider({ ...args, maxTokens: hold.maxOutputTokens });
 *   await payg.finalize(hold, usage, { toolCalls });
 * } catch (error) {
 *   await payg.release(hold, 'PROVIDER_ERROR');
 *   throw error;
 * }
 * ```
 */
@Injectable()
export class PaygMeter {
  private readonly authServiceUrl: string;
  private readonly interServiceToken: string;
  private readonly timeoutMs: number;
  private readonly exemptProviders: readonly string[];

  constructor(options: PaygMeterOptions) {
    // Linear reverse walk instead of /\/+$/ — that pattern is polynomial-ReDoS
    // on uncontrolled input and CodeQL flags it. Same fix as EntitlementsAdapter.
    let end = options.authServiceUrl.length;
    while (end > 0 && options.authServiceUrl[end - 1] === '/') {
      end -= 1;
    }
    this.authServiceUrl = options.authServiceUrl.slice(0, end);
    this.interServiceToken = options.interServiceToken;
    this.timeoutMs = options.timeoutMs ?? 5000;
    this.exemptProviders = options.exemptProviders ?? PAYG_EXEMPT_PROVIDERS;
  }

  /**
   * Places a hold before the provider call and returns the ceiling to send.
   *
   * FAILS CLOSED for a metered provider, OPEN for an exempt one. If auth-service
   * is unreachable, a request to OpenAI is refused — waving it through would
   * hand out unbounded provider spend during exactly the outage where nobody is
   * watching — while a request to local Ollama proceeds, so an auth blip does
   * not take the whole product down. That asymmetry is decision D4, not an
   * oversight.
   *
   * @throws PaygCreditExhaustedError on a 402, or on an unreachable meter for a
   * metered provider.
   */
  async reserve(input: PaygReserveInput): Promise<PaygHold> {
    if (this.isExempt(input.provider)) {
      return PaygMeter.unmeteredHold(input.requestedMaxOutputTokens, 'NOT_PAYG');
    }

    let payload: unknown;
    try {
      payload = await this.request(`${CREDIT_INTERNAL_API_BASE}/reserve`, {
        userId: input.userId,
        requestId: input.requestId,
        provider: input.provider,
        model: input.model,
        surface: input.surface,
        workflow: input.workflow ?? null,
        promptTokens: Math.max(0, Math.floor(input.promptTokens)),
        cachedPromptTokens: Math.max(0, Math.floor(input.cachedPromptTokens ?? 0)),
        requestedMaxOutputTokens: Math.max(1, Math.floor(input.requestedMaxOutputTokens)),
      });
    } catch (error) {
      if (error instanceof PaygCreditExhaustedError) {
        throw error;
      }
      // Unreachable meter on a provider we could not prove is free. The safe
      // direction is refusal: an unmetered frontier call is unbounded liability,
      // and the copy for PAYG_PRICING_UNAVAILABLE says "temporarily
      // unavailable" rather than blaming the user's balance.
      throw new PaygCreditExhaustedError(BillingErrorCode.PAYG_PRICING_UNAVAILABLE, 0, null);
    }

    if (isWireMetered(payload)) {
      return {
        metered: true,
        maxOutputTokens: payload.maxOutputTokens,
        clamped: payload.clamped === true,
        reservationId: payload.reservationId,
        heldMicroUsd: payload.heldMicroUsd,
        availableAfterMicroUsd: payload.availableAfterMicroUsd,
        reason: null,
      };
    }
    if (isWireUnmetered(payload)) {
      const hold = PaygMeter.unmeteredHold(payload.maxOutputTokens, 'NOT_PAYG');
      return { ...hold, reason: PaygMeter.narrowReason(payload.reason) };
    }
    // A reply we cannot parse is a reply we cannot trust with money.
    throw new PaygCreditExhaustedError(BillingErrorCode.PAYG_PRICING_UNAVAILABLE, 0, null);
  }

  /**
   * Settles a hold against what the call actually used.
   *
   * Never throws. By the time this runs the user already has their answer, and
   * turning a bookkeeping failure into a failed request would be a strictly
   * worse outcome — the sweeper reclaims an unfinalized hold after
   * `PAYG_RESERVATION_TTL_MS`.
   */
  async finalize(
    hold: PaygHold,
    usage: PaygFinalizeUsage,
    calls: PaygFinalizeCalls = {},
  ): Promise<void> {
    if (!hold.metered || hold.reservationId === null) {
      return;
    }
    try {
      await this.request(`${CREDIT_INTERNAL_API_BASE}/finalize`, {
        reservationId: hold.reservationId,
        usage: {
          promptTokens: Math.max(0, Math.floor(usage.promptTokens)),
          completionTokens: Math.max(0, Math.floor(usage.completionTokens)),
          cachedPromptTokens: Math.max(0, Math.floor(usage.cachedPromptTokens)),
          reasoningTokens: Math.max(0, Math.floor(usage.reasoningTokens)),
        },
        toolCalls: Math.max(0, Math.floor(calls.toolCalls ?? 0)),
        searchCalls: Math.max(0, Math.floor(calls.searchCalls ?? 0)),
      });
    } catch {
      // Swallowed on purpose. See the doc comment: the sweeper is the backstop,
      // and it runs well inside PAYG_RESERVATION_TTL_MS.
      void PAYG_RESERVATION_TTL_MS;
    }
  }

  /**
   * Gives a hold back when the request never reached the user.
   *
   * Never throws, for the same reason as finalize, and idempotent on the
   * auth side — a double release is a no-op, not a double refund.
   */
  async release(hold: PaygHold, reason: PaygReleaseReason): Promise<void> {
    if (!hold.metered || hold.reservationId === null) {
      return;
    }
    try {
      await this.request(`${CREDIT_INTERNAL_API_BASE}/release`, {
        reservationId: hold.reservationId,
        reason,
      });
    } catch {
      void reason;
    }
  }

  private isExempt(provider: string): boolean {
    const normalized = provider.toUpperCase();
    return this.exemptProviders.some((exempt) => exempt.toUpperCase() === normalized);
  }

  private static narrowReason(reason: string): PaygHold['reason'] {
    if (
      reason === 'NOT_PAYG' ||
      reason === 'METERING_DISABLED' ||
      reason === 'ADMIN_BYPASS' ||
      reason === 'METER_UNAVAILABLE_EXEMPT'
    ) {
      return reason;
    }
    return 'NOT_PAYG';
  }

  private static unmeteredHold(maxOutputTokens: number, reason: PaygHold['reason']): PaygHold {
    return {
      metered: false,
      maxOutputTokens,
      clamped: false,
      reservationId: null,
      heldMicroUsd: 0,
      availableAfterMicroUsd: 0,
      reason,
    };
  }

  private async request(path: string, body: unknown): Promise<unknown> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await fetch(`${this.authServiceUrl}/api/v1${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // The credit routes are guarded, unlike internal/quota. Without this
          // every call is a 401 the meter reads as an outage.
          Authorization: `Service ${this.interServiceToken}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (response.status === 402) {
        const payload: unknown = await response.json().catch(() => null);
        throw new PaygCreditExhaustedError(
          readErrorCode(payload),
          readNumber(payload, 'availableMicroUsd'),
          isRecord(payload) && typeof payload['requiredMicroUsd'] === 'number'
            ? payload['requiredMicroUsd']
            : null,
        );
      }
      if (response.status === 401 || response.status === 403) {
        // A misconfiguration, not an outage, and the two need different fixes.
        // Failing closed is still right — but the operator must be able to tell
        // "our token is wrong" from "auth is down" without reading a diff.
        throw new Error(
          `PAYG meter rejected: ${path} → ${String(response.status)}. ` +
            'INTER_SERVICE_AUTH_TOKEN is missing or does not match auth-service. ' +
            'Every paid model stays blocked until this is fixed.',
        );
      }
      if (!response.ok) {
        throw new Error(`PAYG meter request failed: ${path} → ${String(response.status)}`);
      }
      if (response.status === 204) {
        return undefined;
      }
      return await response.json();
    } finally {
      clearTimeout(timer);
    }
  }
}
