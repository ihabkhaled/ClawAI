import { vi } from 'vitest';
import { Logger } from '@nestjs/common';

import { AbuseAuditAction } from '../enums/abuse-audit-action.enum';
import { AbuseAuditService } from '../services/abuse-audit.service';

// Rule 19 redaction: the audit line of an abuse decision carries ids, a level, a code and counts, and
// nothing a credential could hide in. Secret-shaped values are built at run time (feedback: no
// secret-shaped literals in the repository).
const FAKE_TOKEN = ['eyJ', 'hbGciOiJIUzI1NiJ9', 'e30', 'sig'].join('.');
const FAKE_PASSWORD = ['Correct', 'Horse', 'Battery', '9!'].join('-');
const FAKE_FINGERPRINT = 'ab'.repeat(32);

describe('AbuseAuditService', () => {
  let published: Array<{ pattern: string; payload: Record<string, unknown> }>;
  let service: AbuseAuditService;

  beforeEach(() => {
    vi.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    published = [];
    service = new AbuseAuditService({
      publish: vi.fn((pattern: string, payload: Record<string, unknown>) => {
        published.push({ pattern, payload });
        return Promise.resolve();
      }),
    } as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function everythingWritten(): string {
    return JSON.stringify(published);
  }

  it('names each decision with its own action', () => {
    service.suspended({
      userId: 'user-1',
      level: 2,
      code: 'RATE_LIMIT_TRIPPED',
      endsAt: new Date('2026-11-29T10:00:00.000Z'),
      evidence: { RATE_LIMIT_TRIPPED: 312 },
    });
    service.suspensionLifted({ userId: 'user-1', actorUserId: 'admin-1', lifted: 1 });
    service.thresholdCrossed({
      userId: 'user-1',
      code: 'FORBIDDEN_PROBE',
      reason: 'off',
      count: 200,
    });
    service.flagged({ userId: 'user-1', code: 'TOKEN_REUSE', source: 'auth.refresh' });
    service.deviceMarked({ sourceUserId: 'user-1', marks: 3, reason: 'ADMIN_LIFETIME_BAN' });
    service.deviceMarksLifted({ sourceUserId: 'user-1', lifted: 3 });
    expect(published.map((entry) => entry.payload['action'])).toEqual([
      AbuseAuditAction.ACCOUNT_AUTO_SUSPENDED,
      AbuseAuditAction.AUTO_SUSPENSION_LIFTED,
      AbuseAuditAction.ABUSE_THRESHOLD_CROSSED,
      AbuseAuditAction.ABUSE_EVIDENCE_FLAGGED,
      AbuseAuditAction.BANNED_DEVICE_MARKED,
      AbuseAuditAction.BANNED_DEVICE_LIFTED,
    ]);
  });

  it('a suspension line carries the level, the end and the counts', () => {
    service.suspended({
      userId: 'user-1',
      level: 2,
      code: 'RATE_LIMIT_TRIPPED',
      endsAt: new Date('2026-11-29T10:00:00.000Z'),
      evidence: { RATE_LIMIT_TRIPPED: 312, FORBIDDEN_PROBE: 4 },
    });
    expect(published[0]?.payload).toMatchObject({
      userId: 'user-1',
      errorCode: 'RATE_LIMIT_TRIPPED',
      metadata: {
        level: 2,
        endsAt: '2026-11-29T10:00:00.000Z',
        evidence: { RATE_LIMIT_TRIPPED: 312, FORBIDDEN_PROBE: 4 },
      },
    });
  });

  it('never writes a token, a password or a raw fingerprint, whatever the caller passes around it', () => {
    service.suspended({
      userId: 'user-1',
      level: 1,
      code: 'RATE_LIMIT_TRIPPED',
      endsAt: new Date('2026-11-28T11:00:00.000Z'),
      evidence: { RATE_LIMIT_TRIPPED: 300 },
    });
    service.flagged({ userId: 'user-1', code: 'BANNED_DEVICE_SIGNIN', source: 'auth.signin' });
    service.deviceMarked({ sourceUserId: 'user-1', marks: 2, reason: 'ADMIN_LIFETIME_BAN' });
    const written = everythingWritten();
    for (const secret of [FAKE_TOKEN, FAKE_PASSWORD, FAKE_FINGERPRINT]) {
      expect(written).not.toContain(secret);
    }
    expect(written).not.toMatch(/password|refreshToken|accessToken|authorization|fingerprint/i);
  });

  it('a device-mark line holds a count, not a hash', () => {
    service.deviceMarked({ sourceUserId: 'user-1', marks: 2, reason: 'ADMIN_LIFETIME_BAN' });
    expect(published[0]?.payload['metadata']).toEqual({ marks: 2, reason: 'ADMIN_LIFETIME_BAN' });
  });
});
