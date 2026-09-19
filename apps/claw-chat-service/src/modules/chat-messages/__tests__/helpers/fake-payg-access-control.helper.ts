import { type Mock, vi } from 'vitest';
import type { PaygHold } from '@claw/shared-entitlements';

import type { AccessControlService } from '../../services/access-control.service';
/** Knobs for the shared AccessControlService double used across the PAYG suites. */
export type FakePaygAccessControlOptions = {
  metered?: boolean;
  maxOutputTokens?: number;
  clamped?: boolean;
  reservationId?: string;
  heldMicroUsd?: number;
  /** When set, `reserveCredit` throws this instead of returning a hold. */
  refuseWith?: unknown;
  /** When set, the AI-file allowance is used up (ADR-110). */
  fileLimit?: { used: number; limit: number };
};

/** The shape a PAYG test asserts against. */
export type FakePaygAccessControl = {
  hold: PaygHold;
  reserveCredit: Mock;
  finalizeCredit: Mock;
  releaseCredit: Mock;
  meterOrchestrationCall: Mock;
  recordUsage: Mock;
  recordFeatureUsage: Mock;
  reserveFeature: Mock;
  settleFeature: Mock;
  assertCanUseCritic: Mock;
  assertResearchAccess: Mock;
  resolveOutputCeiling: Mock;
};

/**
 * An AccessControlService double whose PAYG surface is real enough to assert on.
 *
 * Every money-spending path now reserves before the provider call and finalizes
 * or releases after it, so a bare `{ recordUsage }` stub makes the chokepoint
 * throw on `reserveCredit is not a function`. This is the shared double: it
 * hands back a hold, records what was reserved, and lets a test say "the meter
 * moved" or "the hold went back" without standing up auth-service.
 *
 * `metered` defaults to true because the interesting assertions are the metered
 * ones. A test that wants the local-runtime path passes `metered: false`.
 */
export function createFakePaygAccessControl(
  options: FakePaygAccessControlOptions = {},
): FakePaygAccessControl {
  const hold: PaygHold = {
    metered: options.metered ?? true,
    // Deliberately huge by default. `applyPaygCeiling` only rewrites the
    // request when the hold is SMALLER than what was asked for, so an
    // unclamped double must not accidentally impose a ceiling and change what
    // every unrelated suite asserts about the request body.
    maxOutputTokens: options.maxOutputTokens ?? 1_000_000,
    clamped: options.clamped ?? false,
    reservationId: options.metered === false ? null : (options.reservationId ?? 'res-1'),
    heldMicroUsd: options.heldMicroUsd ?? 50_000,
    availableAfterMicroUsd: 0,
    reason: options.metered === false ? 'NOT_PAYG' : null,
  };
  const reserveCredit = vi.fn(async () => {
    if (options.refuseWith !== undefined) {
      throw options.refuseWith;
    }
    return hold;
  });
  const finalizeCredit = vi.fn(async () => {});
  const releaseCredit = vi.fn(async () => {});
  // Mirrors the real implementation closely enough to prove the two things that
  // matter: a successful call settles, and a thrown one gives the money back.
  const meterOrchestrationCall = vi.fn(
    async (
      _call: unknown,
      run: (held: PaygHold) => Promise<unknown>,
      usageOf: (result: unknown) => { promptTokens: number; completionTokens: number },
    ) => {
      await reserveCredit();
      let result: unknown;
      try {
        result = await run(hold);
      } catch (error: unknown) {
        await releaseCredit();
        throw error;
      }
      await finalizeCredit();
      void usageOf(result);
      return result;
    },
  );
  const double = {
    hold,
    reserveCredit,
    finalizeCredit,
    releaseCredit,
    meterOrchestrationCall,
    recordUsage: vi.fn(),
    recordFeatureUsage: vi.fn(async () => {}),
    reserveFeature: vi.fn(async () =>
      options.fileLimit === undefined
        ? { allowed: true, reservationId: 'feature-res-1' }
        : {
            allowed: false,
            reason: 'FEATURE_TRIAL_EXHAUSTED',
            ...options.fileLimit,
            window: 'DAY',
          },
    ),
    settleFeature: vi.fn(async () => {}),
    assertCanUseCritic: vi.fn(async () => {}),
    assertResearchAccess: vi.fn(async () => {}),
    // null = no quota ceiling, which is what an unlimited/admin entitlement
    // resolves to. A test that wants the clamp asserts on it explicitly.
    resolveOutputCeiling: vi.fn(async () => null),
  };
  return double as unknown as FakePaygAccessControl;
}

/** The same double, typed as the service the managers actually inject. */
export function asAccessControlService(double: FakePaygAccessControl): AccessControlService {
  return double as unknown as AccessControlService;
}
