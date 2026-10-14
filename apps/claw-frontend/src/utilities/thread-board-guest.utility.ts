import {
  THREAD_BOARD_GUEST_LOGIN_PATH,
  THREAD_BOARD_GUEST_REGISTER_PATH,
} from '@/constants/thread-board-guest.constants';
import { stripLocaleFromPathname } from '@/utilities/locale.utility';

/** The page a guest returns to after signing in: this path (no language prefix) and its query. */
export function guestReturnTarget(pathname: string, search: string): string {
  const path = stripLocaleFromPathname(pathname);
  return search === '' ? path : `${path}?${search}`;
}

export function guestSignInHref(returnTarget: string): string {
  return `${THREAD_BOARD_GUEST_LOGIN_PATH}?returnTo=${encodeURIComponent(returnTarget)}`;
}

export function guestRegisterHref(returnTarget: string): string {
  return `${THREAD_BOARD_GUEST_REGISTER_PATH}?returnTo=${encodeURIComponent(returnTarget)}`;
}

/** The sign-up address that matches a sign-in address, so both bring the guest back to the same page. */
export function registerHrefFromSignIn(signInHref: string): string {
  return signInHref.startsWith(THREAD_BOARD_GUEST_LOGIN_PATH)
    ? `${THREAD_BOARD_GUEST_REGISTER_PATH}${signInHref.slice(THREAD_BOARD_GUEST_LOGIN_PATH.length)}`
    : THREAD_BOARD_GUEST_REGISTER_PATH;
}
