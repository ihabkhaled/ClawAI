import { HttpStatus } from '@nestjs/common';

import { LiveErrorCode } from '../../../../common/enums/live-error-code.enum';
import { LiveSourceKind } from '../../../../generated/prisma';
import { LiveSessionAdmissionManager } from '../live-session-admission.manager';

const policy = (overrides: Record<string, unknown> = {}) =>
  ({
    version: 1,
    config: {
      featureEnabled: true,
      killSwitch: false,
      maxSessionsPerUser: 2,
      sessionsPerUserPerHour: 5,
      ...overrides,
    },
  }) as never;

function setup() {
  const sessions = { countOpen: vi.fn().mockResolvedValue(0) };
  const presence = { countHourlyStart: vi.fn().mockResolvedValue(1) };
  const coordinator = { admissionRefusal: vi.fn().mockResolvedValue(null) };
  return {
    manager: new LiveSessionAdmissionManager(
      sessions as never,
      presence as never,
      coordinator as never,
    ),
    sessions,
    presence,
    coordinator,
  };
}

async function errorOf(promise: Promise<unknown> | (() => void)) {
  try {
    if (typeof promise === 'function') promise();
    else await promise;
  } catch (error: unknown) {
    return error as { getStatus(): number; getResponse(): { errorCode: string } };
  }
  throw new Error('expected a rejection');
}

describe('LiveSessionAdmissionManager', () => {
  it('refuses when the feature is off or the kill switch is on (503)', async () => {
    const { manager } = setup();
    const off = await errorOf(() =>
      manager.assertFeatureEnabled(policy({ featureEnabled: false })),
    );
    expect(off.getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
    expect(off.getResponse().errorCode).toBe(LiveErrorCode.LIVE_DISABLED);
    const killed = await errorOf(() =>
      manager.assertProcessingAllowed(policy({ killSwitch: true })),
    );
    expect(killed.getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
    expect(() => manager.assertFeatureEnabled(policy())).not.toThrow();
  });

  it('requires the rights attestation for HLS only (422)', async () => {
    const { manager } = setup();
    const missing = await errorOf(() =>
      manager.assertAttestation({ sourceKind: LiveSourceKind.HLS } as never, false),
    );
    expect(missing.getStatus()).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
    expect(missing.getResponse().errorCode).toBe(LiveErrorCode.LIVE_RIGHTS_ATTESTATION_REQUIRED);
    expect(() =>
      manager.assertAttestation({ sourceKind: LiveSourceKind.FIXTURE } as never, false),
    ).not.toThrow();
    expect(() =>
      manager.assertAttestation({ sourceKind: LiveSourceKind.HLS } as never, true),
    ).not.toThrow();
  });

  it('enforces the concurrent-session limit (429)', async () => {
    const { manager, sessions, presence } = setup();
    sessions.countOpen.mockResolvedValue(2);
    const error = await errorOf(manager.assertLimits('u1', policy()));
    expect(error.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
    expect(error.getResponse().errorCode).toBe(LiveErrorCode.LIVE_SESSION_LIMIT);
    expect(presence.countHourlyStart).not.toHaveBeenCalled();
  });

  it('enforces the hourly start limit (429)', async () => {
    const { manager, presence } = setup();
    presence.countHourlyStart.mockResolvedValue(6);
    const error = await errorOf(manager.assertLimits('u1', policy()));
    expect(error.getResponse().errorCode).toBe(LiveErrorCode.LIVE_SESSION_RATE_LIMITED);
  });

  it('refuses over capacity with code CAPACITY (503)', async () => {
    const { manager, coordinator } = setup();
    coordinator.admissionRefusal.mockResolvedValue('CAPACITY');
    const error = await errorOf(manager.assertCapacity());
    expect(error.getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
    expect(error.getResponse().errorCode).toBe(LiveErrorCode.CAPACITY);
    coordinator.admissionRefusal.mockResolvedValue(null);
    await expect(manager.assertCapacity()).resolves.toBeUndefined();
  });
});
