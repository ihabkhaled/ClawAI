import {
  THREAD_BOARD_GUEST_LOGIN_PATH,
  THREAD_BOARD_GUEST_REGISTER_PATH,
} from '@/constants/thread-board-guest.constants';
import {
  localisePath,
  parseLocaleFromPathname,
  stripLocaleFromPathname,
  withLocaleOf,
} from '@/utilities/locale.utility';

/** The page a guest returns to after signing in: this path (no language prefix) and its query. */
export function guestReturnTarget(pathname: string, search: string): string {
  const path = stripLocaleFromPathname(pathname);
  return search === '' ? path : `${path}?${search}`;
}

/**
 * Sign-in address in the language of the page the guest is reading (`/ar/login?returnTo=...`), so
 * they do not land on the English form. The return target stays language-less: after signing in
 * they come back to the same page in the language of the sign-in screen they used.
 */
export function guestSignInHref(returnTarget: string, currentPathname: string): string {
  return withLocaleOf(
    `${THREAD_BOARD_GUEST_LOGIN_PATH}?returnTo=${encodeURIComponent(returnTarget)}`,
    currentPathname,
  );
}

export function guestRegisterHref(returnTarget: string, currentPathname: string): string {
  return withLocaleOf(
    `${THREAD_BOARD_GUEST_REGISTER_PATH}?returnTo=${encodeURIComponent(returnTarget)}`,
    currentPathname,
  );
}

/** The sign-up address that matches a sign-in address, so both bring the guest back to the same page. */
export function registerHrefFromSignIn(signInHref: string): string {
  const locale = parseLocaleFromPathname(signInHref);
  const bare = stripLocaleFromPathname(signInHref);
  const register = bare.startsWith(THREAD_BOARD_GUEST_LOGIN_PATH)
    ? `${THREAD_BOARD_GUEST_REGISTER_PATH}${bare.slice(THREAD_BOARD_GUEST_LOGIN_PATH.length)}`
    : THREAD_BOARD_GUEST_REGISTER_PATH;
  return locale === null ? register : localisePath(register, locale);
}
