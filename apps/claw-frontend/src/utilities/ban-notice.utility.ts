import { BAN_NOTICE_STORAGE_KEY } from '@/constants/auth.constants';
import type { LoginBanInfo } from '@/types/auth.types';

/**
 * Remembers, for the next page load only, that the server ended this session
 * because an administrator banned the account (ADR-200). The refresh that fails
 * runs in the background, then the app sends the user to the sign-in page; this
 * is what lets that page say why instead of showing an empty form.
 * sessionStorage, not localStorage: it must not outlive the tab.
 */
export function storeBanNotice(notice: LoginBanInfo): void {
  try {
    sessionStorage.setItem(BAN_NOTICE_STORAGE_KEY, JSON.stringify(notice));
  } catch {
    // Private mode or a full quota: the user simply sees the sign-in form.
  }
}

/** Reads and clears the notice. Null when there is none or it is unreadable. */
export function takeBanNotice(): LoginBanInfo | null {
  try {
    const raw = sessionStorage.getItem(BAN_NOTICE_STORAGE_KEY);
    if (raw === null) {
      return null;
    }
    sessionStorage.removeItem(BAN_NOTICE_STORAGE_KEY);
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== 'object') {
      return null;
    }
    const { permanent, until } = parsed as { permanent?: unknown; until?: unknown };
    const untilText = typeof until === 'string' && !Number.isNaN(Date.parse(until)) ? until : null;
    return { permanent: permanent === true || untilText === null, until: untilText };
  } catch {
    return null;
  }
}

/** The ban an ACCOUNT_BANNED refresh reply describes, or null for any other reply body. */
export function banNoticeFromResponse(data: unknown): LoginBanInfo | null {
  if (data === null || typeof data !== 'object') {
    return null;
  }
  const body = data as {
    code?: unknown;
    errorCode?: unknown;
    bannedUntil?: unknown;
    banPermanent?: unknown;
  };
  if ((body.errorCode ?? body.code) !== 'ACCOUNT_BANNED') {
    return null;
  }
  const until =
    typeof body.bannedUntil === 'string' && !Number.isNaN(Date.parse(body.bannedUntil))
      ? body.bannedUntil
      : null;
  return { permanent: body.banPermanent === true || until === null, until };
}
