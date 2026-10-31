import { describe, expect, it } from 'vitest';

import { SessionGlobalAction } from '@/enums/session-global-action.enum';
import { SessionState } from '@/enums/session-state.enum';
import { SessionTerminationReason } from '@/enums/session-termination-reason.enum';
import type { UserSession } from '@/types/admin-sessions.types';
import {
  canClearSessionLog,
  canTerminateSession,
  countInactiveSessions,
  expectedGlobalPhrase,
  formatSessionClientLabel,
  formatSessionEndNote,
  isGlobalPhraseValid,
  resolveClientKindLabel,
  resolveDeviceKindLabel,
  resolveReasonLabel,
  resolveSessionActionCopy,
} from '@/utilities/admin-sessions.utility';

const t = (key: string, params?: Record<string, string | number>): string =>
  params ? `${key}|${Object.values(params).join(',')}` : key;

function session(overrides: Partial<UserSession> = {}): UserSession {
  return {
    familyId: 'f1',
    state: SessionState.ACTIVE,
    ipAddress: '41.33.1.1',
    countryCode: 'EG',
    userAgent: 'UA',
    os: 'Windows',
    browser: 'Chrome 130',
    deviceKind: 'DESKTOP',
    clientKind: 'WEB',
    clientName: null,
    persistent: true,
    loginAt: '2026-10-31T10:00:00Z',
    lastUsedAt: '2026-10-31T11:00:00Z',
    expiresAt: '2026-11-07T10:00:00Z',
    rotations: 1,
    terminatedAt: null,
    terminationReason: null,
    terminatedByUserId: null,
    terminatedByName: null,
    isCurrent: false,
    ...overrides,
  };
}

describe('session labels', () => {
  it('names browser and OS, either one, or nothing', () => {
    expect(formatSessionClientLabel({ browser: 'Chrome 130', os: 'Windows' }, t)).toBe(
      'adminSessions.browserOnOs|Chrome 130,Windows',
    );
    expect(formatSessionClientLabel({ browser: 'curl 8', os: null }, t)).toBe('curl 8');
    expect(formatSessionClientLabel({ browser: null, os: 'Linux' }, t)).toBe('Linux');
    expect(formatSessionClientLabel({ browser: null, os: null }, t)).toBe('-');
  });

  it('maps device and client kinds, never inventing a label', () => {
    expect(resolveDeviceKindLabel('MOBILE', t)).toBe('adminSessions.deviceMobile');
    expect(resolveDeviceKindLabel('SOMETHING', t)).toBe('-');
    expect(resolveDeviceKindLabel(null, t)).toBe('-');
    expect(resolveClientKindLabel('VSCODE', t)).toBe('adminSessions.clientVscode');
    expect(resolveClientKindLabel('OTHER', t)).toBe('OTHER');
  });

  it('maps every termination reason and reads a missing one as unknown', () => {
    for (const reason of Object.values(SessionTerminationReason)) {
      expect(resolveReasonLabel(reason, t)).toMatch(/^adminSessions\.reason[A-Za-z]+$/);
    }
    expect(resolveReasonLabel(null, t)).toBe('adminSessions.reasonUnknown');
  });
});

describe('formatSessionEndNote', () => {
  it('is null unless the login was terminated', () => {
    expect(formatSessionEndNote(session(), t)).toBeNull();
    expect(formatSessionEndNote(session({ state: SessionState.EXPIRED }), t)).toBeNull();
  });

  it('says who: the admin, the user, or the system', () => {
    const base = { state: SessionState.TERMINATED };
    expect(
      formatSessionEndNote(
        session({
          ...base,
          terminationReason: SessionTerminationReason.ADMIN_TERMINATED,
          terminatedByName: 'boss',
        }),
        t,
      ),
    ).toBe('adminSessions.reasonAdminTerminated - adminSessions.byAdmin|boss');
    expect(
      formatSessionEndNote(
        session({ ...base, terminationReason: SessionTerminationReason.USER_LOGOUT }),
        t,
      ),
    ).toBe('adminSessions.reasonUserLogout - adminSessions.byUser');
    expect(
      formatSessionEndNote(
        session({ ...base, terminationReason: SessionTerminationReason.TOKEN_REUSE }),
        t,
      ),
    ).toBe('adminSessions.reasonTokenReuse - adminSessions.bySystem');
    expect(formatSessionEndNote(session(base), t)).toBe(
      'adminSessions.reasonUnknown - adminSessions.bySystem',
    );
  });
});

describe('what can be done to a session', () => {
  it('only an active login can be ended; only a finished one can be cleared', () => {
    expect(canTerminateSession({ state: SessionState.ACTIVE })).toBe(true);
    expect(canTerminateSession({ state: SessionState.EXPIRED })).toBe(false);
    expect(canTerminateSession({ state: SessionState.TERMINATED })).toBe(false);
    expect(canClearSessionLog({ state: SessionState.ACTIVE })).toBe(false);
    expect(canClearSessionLog({ state: SessionState.EXPIRED })).toBe(true);
    expect(canClearSessionLog({ state: SessionState.TERMINATED })).toBe(true);
  });

  it('counts the finished logs', () => {
    expect(countInactiveSessions({ expired: 2, terminated: 3 })).toBe(5);
  });
});

describe('resolveSessionActionCopy', () => {
  it('warns when ending the admin own current login', () => {
    expect(
      resolveSessionActionCopy(
        { kind: 'terminate-one', session: session({ isCurrent: true }) },
        true,
      ).endsCurrentSession,
    ).toBe(true);
    expect(
      resolveSessionActionCopy({ kind: 'terminate-one', session: session() }, true)
        .endsCurrentSession,
    ).toBe(false);
  });

  it('ending all of your own sessions includes the current one; of another user does not', () => {
    expect(resolveSessionActionCopy({ kind: 'terminate-all' }, true).endsCurrentSession).toBe(true);
    expect(resolveSessionActionCopy({ kind: 'terminate-all' }, false).endsCurrentSession).toBe(
      false,
    );
  });

  it('clearing is never destructive-styled and never ends the current session', () => {
    const one = resolveSessionActionCopy({ kind: 'clear-one', session: session() }, true);
    const all = resolveSessionActionCopy({ kind: 'clear-all' }, true);
    expect(one).toMatchObject({ destructive: false, endsCurrentSession: false });
    expect(all).toMatchObject({ destructive: false, endsCurrentSession: false });
  });
});

describe('the typed phrase', () => {
  it('matches exactly, per action', () => {
    expect(expectedGlobalPhrase(SessionGlobalAction.TERMINATE_ALL)).toBe('TERMINATE ALL');
    expect(isGlobalPhraseValid(SessionGlobalAction.TERMINATE_ALL, 'TERMINATE ALL')).toBe(true);
    expect(isGlobalPhraseValid(SessionGlobalAction.TERMINATE_ALL, 'terminate all')).toBe(false);
    expect(isGlobalPhraseValid(SessionGlobalAction.TERMINATE_ALL, 'TERMINATE ALL ')).toBe(false);
    expect(isGlobalPhraseValid(SessionGlobalAction.TERMINATE_ALL, 'CLEAR ALL LOGS')).toBe(false);
    expect(isGlobalPhraseValid(SessionGlobalAction.CLEAR_ALL_LOGS, 'CLEAR ALL LOGS')).toBe(true);
    expect(isGlobalPhraseValid(null, 'TERMINATE ALL')).toBe(false);
  });
});
