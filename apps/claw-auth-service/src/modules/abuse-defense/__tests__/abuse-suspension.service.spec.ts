import { type Mock, vi } from 'vitest';
import { Logger } from '@nestjs/common';
import { EventPattern } from '@claw/shared-types';

import { UserRole } from '../../../common/enums';
import { type SessionRevocationCacheService } from '../../auth/services/session-revocation-cache.service';
import { SessionTerminationReason } from '../../sessions/enums/session-termination-reason.enum';
import { type UsersRepository } from '../../users/repositories/users.repository';
import { AbuseSignalCode } from '../enums/abuse-signal-code.enum';
import { AbuseSignalOutcome } from '../enums/abuse-signal-outcome.enum';
import { type AbuseSuspensionRepository } from '../repositories/abuse-suspension.repository';
import { type AbuseAuditService } from '../services/abuse-audit.service';
import { AbuseSuspensionService } from '../services/abuse-suspension.service';
import type { AbuseSettings } from '../types/abuse-defense.types';

const NOW = new Date('2026-11-28T10:00:00.000Z');
const HOUR = 3_600_000;
const SETTINGS: AbuseSettings = {
  enabled: true,
  windowMinutes: 15,
  thresholds: {
    [AbuseSignalCode.RATE_LIMIT_TRIPPED]: 300,
    [AbuseSignalCode.FORBIDDEN_PROBE]: 200,
    [AbuseSignalCode.SSRF_REFUSED]: 10,
  },
  suspensionMinutes: [60, 1440, 10_080],
  escalationDays: 30,
};
const REQUEST = {
  userId: 'user-1',
  code: AbuseSignalCode.RATE_LIMIT_TRIPPED,
  evidence: { [AbuseSignalCode.RATE_LIMIT_TRIPPED]: 312 },
};
const ACTIVE_USER = {
  id: 'user-1',
  role: UserRole.USER,
  isSuperAdmin: false,
  bannedAt: null as Date | null,
  bannedUntil: null as Date | null,
};

describe('AbuseSuspensionService', () => {
  let user: typeof ACTIVE_USER | null;
  let findById: Mock;
  let revokeSessionsReturningIds: Mock;
  let apply: Mock;
  let countLiveSince: Mock;
  let liftActive: Mock;
  let revoke: Mock;
  let publish: Mock;
  let audit: { suspended: Mock; suspensionLifted: Mock };
  let service: AbuseSuspensionService;

  beforeEach(() => {
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    user = { ...ACTIVE_USER };
    findById = vi.fn(async () => Promise.resolve(user));
    revokeSessionsReturningIds = vi.fn().mockResolvedValue(['s1', 's2']);
    apply = vi.fn().mockResolvedValue({ id: 'suspension-1' });
    countLiveSince = vi.fn().mockResolvedValue(0);
    liftActive = vi.fn().mockResolvedValue(1);
    revoke = vi.fn().mockResolvedValue(undefined);
    publish = vi.fn().mockResolvedValue(undefined);
    audit = { suspended: vi.fn(), suspensionLifted: vi.fn() };
    service = new AbuseSuspensionService(
      { findById, revokeSessionsReturningIds } as unknown as UsersRepository,
      { apply, countLiveSince, liftActive } as unknown as AbuseSuspensionRepository,
      { revoke } as unknown as SessionRevocationCacheService,
      audit as unknown as AbuseAuditService,
      { publish } as never,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('the 1 h, 24 h, 7 d ladder', () => {
    it.each([
      [0, 1, 1 * HOUR],
      [1, 2, 24 * HOUR],
      [2, 3, 7 * 24 * HOUR],
      [3, 3, 7 * 24 * HOUR],
      [40, 3, 7 * 24 * HOUR],
    ])(
      'an account with %i earlier suspensions gets rung %i and %i ms (never permanent)',
      async (prior, level, duration) => {
        countLiveSince.mockResolvedValue(prior);
        const result = await service.suspend(REQUEST, SETTINGS, NOW);
        expect(result).toEqual({
          outcome: AbuseSignalOutcome.SUSPENDED,
          level,
          endsAt: new Date(NOW.getTime() + duration),
        });
        const applied = apply.mock.calls[0]?.[0] as { endsAt: Date | null };
        expect(applied.endsAt).not.toBeNull();
      },
    );

    it('walks 1 h then 24 h then 7 d across three real suspensions', async () => {
      const seen: number[] = [];
      for (let prior = 0; prior < 3; prior += 1) {
        countLiveSince.mockResolvedValue(prior);
        const result = await service.suspend(REQUEST, SETTINGS, NOW);
        seen.push(result.outcome === AbuseSignalOutcome.SUSPENDED ? result.level : -1);
      }
      expect(seen).toEqual([1, 2, 3]);
    });

    it('takes the durations from the settings, not from a constant', async () => {
      await service.suspend(REQUEST, { ...SETTINGS, suspensionMinutes: [5, 10, 20] }, NOW);
      expect((apply.mock.calls[0]?.[0] as { endsAt: Date }).endsAt).toEqual(
        new Date(NOW.getTime() + 5 * 60_000),
      );
    });

    it('counts only suspensions inside the escalation window, and only ones nobody lifted', async () => {
      await service.suspend(REQUEST, { ...SETTINGS, escalationDays: 10 }, NOW);
      expect(countLiveSince).toHaveBeenCalledWith(
        'user-1',
        new Date(NOW.getTime() - 10 * 24 * HOUR),
      );
    });
  });

  describe('what a suspension does', () => {
    it('writes the ban columns and the audit row together, with a reason CODE and the evidence counts', async () => {
      await service.suspend(REQUEST, SETTINGS, NOW);
      expect(apply).toHaveBeenCalledWith({
        userId: 'user-1',
        level: 1,
        reasonCode: AbuseSignalCode.RATE_LIMIT_TRIPPED,
        evidence: { [AbuseSignalCode.RATE_LIMIT_TRIPPED]: 312 },
        startedAt: NOW,
        endsAt: new Date(NOW.getTime() + HOUR),
        banReason: 'AUTO_ABUSE:RATE_LIMIT_TRIPPED',
      });
    });

    it('closes every session AND publishes the ids, so access tokens die now (ADR-112)', async () => {
      await service.suspend(REQUEST, SETTINGS, NOW);
      expect(revokeSessionsReturningIds).toHaveBeenCalledWith(
        'user-1',
        SessionTerminationReason.ACCOUNT_BANNED,
        NOW,
      );
      expect(revoke).toHaveBeenCalledWith(['s1', 's2']);
    });

    it('leaves an audit entry and a user-updated event naming the system, not a person', async () => {
      await service.suspend(REQUEST, SETTINGS, NOW);
      expect(audit.suspended).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-1', level: 1, code: 'RATE_LIMIT_TRIPPED' }),
      );
      expect(publish).toHaveBeenCalledWith(
        EventPattern.USER_UPDATED,
        expect.objectContaining({ userId: 'user-1', updatedBy: 'system:abuse-defence' }),
      );
    });

    it('still suspends when the update event cannot be published', async () => {
      publish.mockRejectedValue(new Error('broker down'));
      await expect(service.suspend(REQUEST, SETTINGS, NOW)).resolves.toMatchObject({
        outcome: AbuseSignalOutcome.SUSPENDED,
      });
    });
  });

  describe('who is never suspended', () => {
    it('an administrator, however many signals they send', async () => {
      user = { ...ACTIVE_USER, role: UserRole.ADMIN };
      await expect(service.suspend(REQUEST, SETTINGS, NOW)).resolves.toEqual({
        outcome: AbuseSignalOutcome.PROTECTED_ACCOUNT,
      });
      expect(apply).not.toHaveBeenCalled();
      expect(revokeSessionsReturningIds).not.toHaveBeenCalled();
    });

    it('the super administrator', async () => {
      user = { ...ACTIVE_USER, isSuperAdmin: true };
      await expect(service.suspend(REQUEST, SETTINGS, NOW)).resolves.toEqual({
        outcome: AbuseSignalOutcome.PROTECTED_ACCOUNT,
      });
    });

    it('an account banned between the check and the write keeps that ban and its sessions', async () => {
      apply.mockResolvedValue(null);
      await expect(service.suspend(REQUEST, SETTINGS, NOW)).resolves.toEqual({
        outcome: AbuseSignalOutcome.ALREADY_BLOCKED,
      });
      expect(revokeSessionsReturningIds).not.toHaveBeenCalled();
    });

    it('an account that is already banned or suspended (one block at a time)', async () => {
      user = { ...ACTIVE_USER, bannedAt: new Date(NOW.getTime() - HOUR), bannedUntil: null };
      await expect(service.suspend(REQUEST, SETTINGS, NOW)).resolves.toEqual({
        outcome: AbuseSignalOutcome.ALREADY_BLOCKED,
      });
      expect(apply).not.toHaveBeenCalled();
    });

    it('treats a timed ban that already ended as no ban', async () => {
      user = {
        ...ACTIVE_USER,
        bannedAt: new Date(NOW.getTime() - 2 * HOUR),
        bannedUntil: new Date(NOW.getTime() - HOUR),
      };
      await expect(service.suspend(REQUEST, SETTINGS, NOW)).resolves.toMatchObject({
        outcome: AbuseSignalOutcome.SUSPENDED,
      });
    });

    it('an account that does not exist', async () => {
      user = null;
      await expect(service.suspend(REQUEST, SETTINGS, NOW)).resolves.toEqual({
        outcome: AbuseSignalOutcome.IGNORED,
      });
    });
  });

  describe('lifting', () => {
    it('marks the running suspension lifted with who and when, and audits it', async () => {
      await expect(service.liftForUser('user-1', 'admin-1', NOW)).resolves.toBe(1);
      expect(liftActive).toHaveBeenCalledWith('user-1', 'admin-1', NOW);
      expect(audit.suspensionLifted).toHaveBeenCalledWith({
        userId: 'user-1',
        actorUserId: 'admin-1',
        lifted: 1,
      });
    });

    it('stays quiet when there was nothing running to lift', async () => {
      liftActive.mockResolvedValue(0);
      await service.liftForUser('user-1', 'admin-1', NOW);
      expect(audit.suspensionLifted).not.toHaveBeenCalled();
    });

    it('never throws into the unban that called it', async () => {
      liftActive.mockRejectedValue(new Error('database down'));
      await expect(service.liftForUser('user-1', 'admin-1', NOW)).resolves.toBe(0);
    });
  });
});
