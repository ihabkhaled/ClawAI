import {
  SESSION_CLIENT_KIND_LABEL_KEYS,
  SESSION_DEVICE_KIND_LABEL_KEYS,
  SESSION_GLOBAL_PHRASES,
  SESSION_REASON_LABEL_KEYS,
  SESSIONS_EMPTY_VALUE,
} from '@/constants/admin-sessions.constants';
import type { SessionGlobalAction } from '@/enums/session-global-action.enum';
import { SessionState } from '@/enums/session-state.enum';
import { SessionTerminationReason } from '@/enums/session-termination-reason.enum';
import type {
  SessionActionCopy,
  SessionActionTarget,
  UserSession,
} from '@/types/admin-sessions.types';
import type { TranslateFunction } from '@/types/i18n.types';

/** "Chrome 130 on Windows", just the browser, just the OS, or '-' when neither is known. */
export function formatSessionClientLabel(
  session: Pick<UserSession, 'browser' | 'os'>,
  t: TranslateFunction,
): string {
  if (session.browser !== null && session.os !== null) {
    return t('adminSessions.browserOnOs', { browser: session.browser, os: session.os });
  }
  return session.browser ?? session.os ?? SESSIONS_EMPTY_VALUE;
}

export function resolveDeviceKindLabel(deviceKind: string | null, t: TranslateFunction): string {
  if (deviceKind === null) {
    return SESSIONS_EMPTY_VALUE;
  }
  const key = SESSION_DEVICE_KIND_LABEL_KEYS[deviceKind];
  return key === undefined ? SESSIONS_EMPTY_VALUE : t(key);
}

export function resolveClientKindLabel(clientKind: string, t: TranslateFunction): string {
  const key = SESSION_CLIENT_KIND_LABEL_KEYS[clientKind];
  return key === undefined ? clientKind : t(key);
}

/** The words for why a login ended; an unknown or missing reason reads as "unknown", never as a guess. */
export function resolveReasonLabel(
  reason: SessionTerminationReason | null,
  t: TranslateFunction,
): string {
  return t(reason === null ? 'adminSessions.reasonUnknown' : SESSION_REASON_LABEL_KEYS[reason]);
}

/**
 * "Ended by an administrator - claw-admin" for a terminated login, null for any other state.
 * Who: the admin's name when one did it, "the user" for a sign-out, otherwise "the system".
 */
export function formatSessionEndNote(session: UserSession, t: TranslateFunction): string | null {
  if (session.state !== SessionState.TERMINATED) {
    return null;
  }
  let who = t('adminSessions.bySystem');
  if (session.terminatedByName !== null) {
    who = t('adminSessions.byAdmin', { name: session.terminatedByName });
  } else if (session.terminationReason === SessionTerminationReason.USER_LOGOUT) {
    who = t('adminSessions.byUser');
  }
  return `${resolveReasonLabel(session.terminationReason, t)} - ${who}`;
}

/** Which words the confirm dialog uses, and whether confirming ends the admin's own current login. */
export function resolveSessionActionCopy(
  target: SessionActionTarget,
  isOwnAccount: boolean,
): SessionActionCopy {
  switch (target.kind) {
    case 'terminate-one':
      return {
        titleKey: 'adminSessions.terminateOneTitle',
        bodyKey: 'adminSessions.terminateOneBody',
        confirmKey: 'adminSessions.terminateConfirm',
        destructive: true,
        endsCurrentSession: target.session.isCurrent,
      };
    case 'terminate-all':
      return {
        titleKey: 'adminSessions.terminateAllTitle',
        bodyKey: 'adminSessions.terminateAllBody',
        confirmKey: 'adminSessions.terminateAllConfirm',
        destructive: true,
        endsCurrentSession: isOwnAccount,
      };
    case 'clear-one':
      return {
        titleKey: 'adminSessions.clearOneTitle',
        bodyKey: 'adminSessions.clearOneBody',
        confirmKey: 'adminSessions.clearConfirm',
        destructive: false,
        endsCurrentSession: false,
      };
    case 'clear-all':
      return {
        titleKey: 'adminSessions.clearAllTitle',
        bodyKey: 'adminSessions.clearAllBody',
        confirmKey: 'adminSessions.clearConfirm',
        destructive: false,
        endsCurrentSession: false,
      };
  }
}

/** Only an ACTIVE login can be ended; only a finished one can have its log cleared. */
export function canTerminateSession(session: Pick<UserSession, 'state'>): boolean {
  return session.state === SessionState.ACTIVE;
}

export function canClearSessionLog(session: Pick<UserSession, 'state'>): boolean {
  return session.state !== SessionState.ACTIVE;
}

/** Whether there is anything to clear, so the "clear finished logs" button is not offered for nothing. */
export function countInactiveSessions(summary: { expired: number; terminated: number }): number {
  return summary.expired + summary.terminated;
}

export function expectedGlobalPhrase(action: SessionGlobalAction): string {
  return SESSION_GLOBAL_PHRASES[action];
}

/** The phrase must match exactly: no trimming, no case folding, the same rule the server applies. */
export function isGlobalPhraseValid(action: SessionGlobalAction | null, typed: string): boolean {
  return action !== null && typed === SESSION_GLOBAL_PHRASES[action];
}
