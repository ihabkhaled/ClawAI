import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';

import { BusinessException } from '../../../common/errors';
import { AbuseSignalCode } from '../enums/abuse-signal-code.enum';
import type { AbuseSettings } from '../types/abuse-defense.types';
import { suspensionDurationMs, suspensionLevelFor } from '../utilities/abuse-escalation.utility';
import {
  classifyAbuseSignal,
  isCountedSignalCode,
} from '../utilities/abuse-signal-classifier.utility';
import {
  abusePersistKey,
  abuseSignalKey,
  abuseSuspendLockKey,
} from '../utilities/abuse-signal-key.utility';
import {
  autoSuspensionReason,
  isAutoSuspension,
  parseEvidence,
} from '../utilities/auto-suspension.utility';

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

describe('classifyAbuseSignal', () => {
  it('maps a 429 HTTP exception to RATE_LIMIT_TRIPPED', () => {
    expect(
      classifyAbuseSignal(new HttpException('slow down', 429), HttpStatus.TOO_MANY_REQUESTS),
    ).toBe(AbuseSignalCode.RATE_LIMIT_TRIPPED);
  });

  it('maps only the plain ForbiddenException to FORBIDDEN_PROBE', () => {
    expect(classifyAbuseSignal(new ForbiddenException(), HttpStatus.FORBIDDEN)).toBe(
      AbuseSignalCode.FORBIDDEN_PROBE,
    );
    expect(
      classifyAbuseSignal(
        new BusinessException('rule', 'SOME_RULE', HttpStatus.FORBIDDEN),
        HttpStatus.FORBIDDEN,
      ),
    ).toBeNull();
  });

  it('says nothing about 401, 404, 5xx or a non-HTTP error', () => {
    expect(classifyAbuseSignal(new UnauthorizedException(), 401)).toBeNull();
    expect(classifyAbuseSignal(new HttpException('x', 404), 404)).toBeNull();
    expect(classifyAbuseSignal(new Error('boom'), 500)).toBeNull();
    expect(classifyAbuseSignal(new Error('not http'), 429)).toBeNull();
  });
});

describe('isCountedSignalCode', () => {
  it('counts the three signals of the account own credential and nothing else', () => {
    expect(Object.values(AbuseSignalCode).filter((code) => isCountedSignalCode(code))).toEqual([
      AbuseSignalCode.RATE_LIMIT_TRIPPED,
      AbuseSignalCode.FORBIDDEN_PROBE,
      AbuseSignalCode.SSRF_REFUSED,
    ]);
  });

  it('never counts a replayed token or a banned-device sign-in', () => {
    expect(isCountedSignalCode(AbuseSignalCode.TOKEN_REUSE)).toBe(false);
    expect(isCountedSignalCode(AbuseSignalCode.BANNED_DEVICE_SIGNIN)).toBe(false);
  });
});

describe('suspension ladder maths', () => {
  it.each([
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 3],
    [99, 3],
    [-4, 1],
    [1.9, 2],
  ])('%s prior suspensions -> rung %i', (prior, level) => {
    expect(suspensionLevelFor(prior)).toBe(level);
  });

  it('maps a rung to its configured minutes', () => {
    expect(suspensionDurationMs(1, SETTINGS)).toBe(60 * 60_000);
    expect(suspensionDurationMs(2, SETTINGS)).toBe(1440 * 60_000);
    expect(suspensionDurationMs(3, SETTINGS)).toBe(10_080 * 60_000);
    expect(suspensionDurationMs(9, SETTINGS)).toBe(10_080 * 60_000);
  });
});

describe('redis keys', () => {
  it('hash the account id: a keyspace dump lists nobody', () => {
    for (const key of [
      abuseSignalKey('cuid-abc-123', AbuseSignalCode.RATE_LIMIT_TRIPPED),
      abusePersistKey('cuid-abc-123', AbuseSignalCode.RATE_LIMIT_TRIPPED),
      abuseSuspendLockKey('cuid-abc-123'),
    ]) {
      expect(key).not.toContain('cuid-abc-123');
      expect(key.startsWith('auth:abuse:sig')).toBe(true);
    }
  });

  it('are stable per account and distinct per code', () => {
    expect(abuseSignalKey('u', AbuseSignalCode.FORBIDDEN_PROBE)).toBe(
      abuseSignalKey('u', AbuseSignalCode.FORBIDDEN_PROBE),
    );
    expect(abuseSignalKey('u', AbuseSignalCode.FORBIDDEN_PROBE)).not.toBe(
      abuseSignalKey('u', AbuseSignalCode.SSRF_REFUSED),
    );
    expect(abuseSignalKey('u', AbuseSignalCode.FORBIDDEN_PROBE)).not.toBe(
      abuseSignalKey('v', AbuseSignalCode.FORBIDDEN_PROBE),
    );
  });
});

describe('automatic suspension markers', () => {
  it('writes a reason CODE with the reserved prefix', () => {
    expect(autoSuspensionReason(AbuseSignalCode.SSRF_REFUSED)).toBe('AUTO_ABUSE:SSRF_REFUSED');
  });

  it('recognises a system-written suspension', () => {
    expect(
      isAutoSuspension({ banReason: 'AUTO_ABUSE:RATE_LIMIT_TRIPPED', bannedByUserId: null }),
    ).toBe(true);
  });

  it('never mistakes an administrator ban for one, even when the admin typed the prefix', () => {
    expect(
      isAutoSuspension({ banReason: 'AUTO_ABUSE:RATE_LIMIT_TRIPPED', bannedByUserId: 'admin-1' }),
    ).toBe(false);
    expect(isAutoSuspension({ banReason: 'spam', bannedByUserId: null })).toBe(false);
    expect(isAutoSuspension({})).toBe(false);
    expect(isAutoSuspension({ banReason: null, bannedByUserId: null })).toBe(false);
  });

  it('reads evidence back as counts of the counted codes only', () => {
    expect(
      parseEvidence({
        RATE_LIMIT_TRIPPED: 312,
        FORBIDDEN_PROBE: 'lots',
        TOKEN_REUSE: 9,
        injected: { nested: true },
      }),
    ).toEqual({ RATE_LIMIT_TRIPPED: 312 });
    expect(parseEvidence(null)).toEqual({});
    expect(parseEvidence([1, 2])).toEqual({});
    expect(parseEvidence('x')).toEqual({});
  });
});
