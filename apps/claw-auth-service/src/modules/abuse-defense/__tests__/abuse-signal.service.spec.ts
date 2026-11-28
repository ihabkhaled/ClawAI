import { type Mock, vi } from 'vitest';
import { Logger } from '@nestjs/common';

import { type AntiAbuseCounterRepository } from '../../anti-abuse/repositories/anti-abuse-counter.repository';
import { AbuseSignalCode } from '../enums/abuse-signal-code.enum';
import { AbuseSignalOutcome } from '../enums/abuse-signal-outcome.enum';
import { type AbuseSignalRepository } from '../repositories/abuse-signal.repository';
import { type AbuseAuditService } from '../services/abuse-audit.service';
import { type AbuseSettingsService } from '../services/abuse-settings.service';
import { AbuseSignalService } from '../services/abuse-signal.service';
import { type AbuseSuspensionService } from '../services/abuse-suspension.service';
import type { AbuseSettings } from '../types/abuse-defense.types';
import { abuseSignalKey } from '../utilities/abuse-signal-key.utility';

const NOW = new Date('2026-11-28T10:00:30.000Z');
const USER = 'user-1';
const SETTINGS: AbuseSettings = {
  enabled: true,
  windowMinutes: 15,
  thresholds: {
    [AbuseSignalCode.RATE_LIMIT_TRIPPED]: 3,
    [AbuseSignalCode.FORBIDDEN_PROBE]: 5,
    [AbuseSignalCode.SSRF_REFUSED]: 2,
  },
  suspensionMinutes: [60, 1440, 10_080],
  escalationDays: 30,
};
const SUSPENDED = {
  outcome: AbuseSignalOutcome.SUSPENDED,
  level: 1,
  endsAt: new Date('2026-11-28T11:00:30.000Z'),
};

describe('AbuseSignalService', () => {
  let settings: AbuseSettings;
  let counts: Map<string, number>;
  let hit: Mock;
  let read: Mock;
  let claimOnce: Mock;
  let reset: Mock;
  let upsertBucket: Mock;
  let suspend: Mock;
  let audit: { flagged: Mock; thresholdCrossed: Mock };
  let service: AbuseSignalService;

  beforeEach(() => {
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    settings = { ...SETTINGS };
    counts = new Map();
    hit = vi.fn(async (key: string) => {
      const count = (counts.get(key) ?? 0) + 1;
      counts.set(key, count);
      return Promise.resolve({ count, ttlSeconds: 900 });
    });
    read = vi.fn(async (key: string) => Promise.resolve(counts.get(key) ?? 0));
    claimOnce = vi.fn().mockResolvedValue(true);
    reset = vi.fn(async (key: string) => {
      counts.delete(key);
      return Promise.resolve();
    });
    upsertBucket = vi.fn().mockResolvedValue(undefined);
    suspend = vi.fn().mockResolvedValue(SUSPENDED);
    audit = { flagged: vi.fn(), thresholdCrossed: vi.fn() };
    service = new AbuseSignalService(
      { resolve: vi.fn(async () => Promise.resolve(settings)) } as unknown as AbuseSettingsService,
      { hit, read, claimOnce, reset } as unknown as AntiAbuseCounterRepository,
      { upsertBucket } as unknown as AbuseSignalRepository,
      { suspend } as unknown as AbuseSuspensionService,
      audit as unknown as AbuseAuditService,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function record(code: AbuseSignalCode, times = 1): Promise<AbuseSignalOutcome> {
    let outcome = AbuseSignalOutcome.IGNORED;
    for (let i = 0; i < times; i += 1) {
      outcome = await service.record({ userId: USER, code, source: 'auth.http' }, NOW);
    }
    return outcome;
  }

  describe('counted signals', () => {
    it('records below the threshold and suspends nobody', async () => {
      await expect(record(AbuseSignalCode.RATE_LIMIT_TRIPPED, 2)).resolves.toBe(
        AbuseSignalOutcome.RECORDED,
      );
      expect(suspend).not.toHaveBeenCalled();
    });

    it('counts in a window of windowMinutes, keyed on the hashed account id', async () => {
      await record(AbuseSignalCode.FORBIDDEN_PROBE);
      expect(hit).toHaveBeenCalledWith(abuseSignalKey(USER, AbuseSignalCode.FORBIDDEN_PROBE), 900);
      expect(abuseSignalKey(USER, AbuseSignalCode.FORBIDDEN_PROBE)).not.toContain(USER);
    });

    it('suspends exactly when the window count reaches the threshold, with the counts as evidence', async () => {
      counts.set(abuseSignalKey(USER, AbuseSignalCode.FORBIDDEN_PROBE), 4);
      await expect(record(AbuseSignalCode.RATE_LIMIT_TRIPPED, 3)).resolves.toBe(
        AbuseSignalOutcome.SUSPENDED,
      );
      expect(suspend).toHaveBeenCalledTimes(1);
      expect(suspend).toHaveBeenCalledWith(
        {
          userId: USER,
          code: AbuseSignalCode.RATE_LIMIT_TRIPPED,
          evidence: {
            [AbuseSignalCode.RATE_LIMIT_TRIPPED]: 3,
            [AbuseSignalCode.FORBIDDEN_PROBE]: 4,
          },
        },
        settings,
        NOW,
      );
    });

    it('starts the account clean after a suspension: every counted window is reset', async () => {
      await record(AbuseSignalCode.RATE_LIMIT_TRIPPED, 3);
      for (const code of [
        AbuseSignalCode.RATE_LIMIT_TRIPPED,
        AbuseSignalCode.FORBIDDEN_PROBE,
        AbuseSignalCode.SSRF_REFUSED,
      ]) {
        expect(reset).toHaveBeenCalledWith(abuseSignalKey(USER, code));
      }
    });

    it('uses the threshold of its own code', async () => {
      await expect(record(AbuseSignalCode.SSRF_REFUSED, 2)).resolves.toBe(
        AbuseSignalOutcome.SUSPENDED,
      );
      suspend.mockClear();
      await expect(record(AbuseSignalCode.FORBIDDEN_PROBE, 4)).resolves.toBe(
        AbuseSignalOutcome.RECORDED,
      );
      expect(suspend).not.toHaveBeenCalled();
    });

    it('decides once: a second crossing in the same minute does not suspend again', async () => {
      claimOnce.mockImplementation(async (key: string) =>
        Promise.resolve(!key.includes('sig-suspend') ? true : false),
      );
      await expect(record(AbuseSignalCode.RATE_LIMIT_TRIPPED, 3)).resolves.toBe(
        AbuseSignalOutcome.ALREADY_BLOCKED,
      );
      expect(suspend).not.toHaveBeenCalled();
    });

    it('reports a protected account and an already-blocked account to the audit log, not as a suspension', async () => {
      suspend.mockResolvedValue({ outcome: AbuseSignalOutcome.PROTECTED_ACCOUNT });
      await expect(record(AbuseSignalCode.RATE_LIMIT_TRIPPED, 3)).resolves.toBe(
        AbuseSignalOutcome.PROTECTED_ACCOUNT,
      );
      expect(audit.thresholdCrossed).toHaveBeenCalledWith(
        expect.objectContaining({ userId: USER, count: 3 }),
      );
      expect(reset).not.toHaveBeenCalled();
    });
  });

  describe('kill switch OFF records signals only', () => {
    beforeEach(() => {
      settings = { ...SETTINGS, enabled: false };
    });

    it('never suspends, however far past the threshold, but still stores the crossing', async () => {
      await expect(record(AbuseSignalCode.RATE_LIMIT_TRIPPED, 50)).resolves.toBe(
        AbuseSignalOutcome.RECORDED_ONLY,
      );
      expect(suspend).not.toHaveBeenCalled();
      expect(upsertBucket).toHaveBeenCalledWith(
        expect.objectContaining({
          code: AbuseSignalCode.RATE_LIMIT_TRIPPED,
          count: 3,
          counted: true,
        }),
      );
    });

    it('logs the crossing once, not once per request', async () => {
      await record(AbuseSignalCode.RATE_LIMIT_TRIPPED, 50);
      expect(audit.thresholdCrossed).toHaveBeenCalledTimes(1);
    });
  });

  describe('uncounted evidence can never suspend', () => {
    it.each([AbuseSignalCode.TOKEN_REUSE, AbuseSignalCode.BANNED_DEVICE_SIGNIN])(
      '%s is flagged, stored uncounted, and never reaches the suspension service',
      async (code) => {
        await expect(record(code, 500)).resolves.toBe(AbuseSignalOutcome.FLAGGED);
        expect(suspend).not.toHaveBeenCalled();
        expect(upsertBucket).toHaveBeenCalledWith(
          expect.objectContaining({ code, counted: false }),
        );
      },
    );

    it('writes one audit flag per window, not one per replay', async () => {
      await record(AbuseSignalCode.TOKEN_REUSE, 20);
      expect(audit.flagged).toHaveBeenCalledTimes(1);
    });
  });

  describe('storage is bounded', () => {
    it('stores at most one bucket a minute per (account, code) below the threshold', async () => {
      claimOnce.mockResolvedValueOnce(true).mockResolvedValue(false);
      await record(AbuseSignalCode.FORBIDDEN_PROBE, 4);
      expect(upsertBucket).toHaveBeenCalledTimes(1);
      expect(upsertBucket).toHaveBeenCalledWith(
        expect.objectContaining({ bucketStart: new Date('2026-11-28T10:00:00.000Z'), count: 1 }),
      );
    });

    it('always stores the exact crossing, even when the minute gate is shut', async () => {
      claimOnce.mockImplementation(async (key: string) =>
        Promise.resolve(key.includes('sig-suspend')),
      );
      await record(AbuseSignalCode.RATE_LIMIT_TRIPPED, 3);
      expect(upsertBucket).toHaveBeenCalledWith(expect.objectContaining({ count: 3 }));
    });
  });

  describe('failure never reaches the request path', () => {
    it('a counter store that cannot answer means nothing is counted and nobody is suspended', async () => {
      hit.mockResolvedValue(null);
      await expect(record(AbuseSignalCode.RATE_LIMIT_TRIPPED, 10)).resolves.toBe(
        AbuseSignalOutcome.UNCOUNTED_NO_STORE,
      );
      expect(suspend).not.toHaveBeenCalled();
      expect(upsertBucket).not.toHaveBeenCalled();
    });

    it('a failing database write does not stop the decision', async () => {
      upsertBucket.mockRejectedValue(new Error('database down'));
      await expect(record(AbuseSignalCode.RATE_LIMIT_TRIPPED, 3)).resolves.toBe(
        AbuseSignalOutcome.SUSPENDED,
      );
    });

    it('never throws, even when the settings read fails', async () => {
      const failing = new AbuseSignalService(
        {
          resolve: vi.fn().mockRejectedValue(new Error('settings down')),
        } as unknown as AbuseSettingsService,
        { hit, read, claimOnce, reset } as unknown as AntiAbuseCounterRepository,
        { upsertBucket } as unknown as AbuseSignalRepository,
        { suspend } as unknown as AbuseSuspensionService,
        audit as unknown as AbuseAuditService,
      );
      await expect(
        failing.record({ userId: USER, code: AbuseSignalCode.RATE_LIMIT_TRIPPED, source: 'x' }),
      ).resolves.toBe(AbuseSignalOutcome.IGNORED);
    });

    it('ignores an empty or oversized account id without touching a counter', async () => {
      for (const userId of ['', 'x'.repeat(65)]) {
        await expect(
          service.record({ userId, code: AbuseSignalCode.RATE_LIMIT_TRIPPED, source: 'x' }),
        ).resolves.toBe(AbuseSignalOutcome.IGNORED);
      }
      expect(hit).not.toHaveBeenCalled();
    });
  });
});
