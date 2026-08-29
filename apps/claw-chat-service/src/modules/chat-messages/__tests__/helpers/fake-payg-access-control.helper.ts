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
};

/** The shape a PAYG test asserts against. */
export type FakePaygAccessControl = {
  hold: PaygHold;
  reserveCredit: jest.Mock;
  finalizeCredit: jest.Mock;
  releaseCredit: jest.Mock;
  meterOrchestrationCall: jest.Mock;
  recordUsage: jest.Mock;
  recordFeatureUsage: jest.Mock;
  assertCanUseCritic: jest.Mock;
  assertResearchAccess: jest.Mock;
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
  const reserveCredit = jest.fn(async () => {
    if (options.refuseWith !== undefined) {
      throw options.refuseWith;
    }
    return hold;
  });
  const finalizeCredit = jest.fn(async () => {});
  const releaseCredit = jest.fn(async () => {});
  // Mirrors the real implementation closely enough to prove the two things that
  // matter: a successful call settles, and a thrown one gives the money back.
  const meterOrchestrationCall = jest.fn(
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
    recordUsage: jest.fn(),
    recordFeatureUsage: jest.fn(async () => {}),
    assertCanUseCritic: jest.fn(async () => {}),
    assertResearchAccess: jest.fn(async () => {}),
  };
  return double as unknown as FakePaygAccessControl;
}

/** The same double, typed as the service the managers actually inject. */
export function asAccessControlService(double: FakePaygAccessControl): AccessControlService {
  return double as unknown as AccessControlService;
}
