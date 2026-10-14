import { ROUTES } from '@/constants/routes.constants';

/**
 * Where the public, read-only Threads board lives (locale-prefixed by the router). It is declared
 * here, not imported from the SEO registry file, so the header and footer do not pull the 13-locale
 * SEO copy into the client bundle; a test keeps the two equal.
 */
export const THREADS_PUBLIC_BOARD_PATH = '/threads/board';

/** The guest endpoints of threads-service; no token is needed or sent for them. */
export const THREAD_BOARD_PUBLIC_API_PATH = '/thread-publications/public/board';
export const THREAD_BOARD_PUBLIC_SUGGEST_API_PATH = '/thread-publications/public/board/suggest';

/** The marketing page is rendered on the server, cached for a minute (ADR-178 addendum). */
export const THREAD_BOARD_PUBLIC_REVALIDATE_SECONDS = 60;

export const THREAD_BOARD_GUEST_LOGIN_PATH = ROUTES.LOGIN;
export const THREAD_BOARD_GUEST_REGISTER_PATH = ROUTES.REGISTER;

/** Query keys that make a Board URL a filtered view, which is never indexed. */
export const THREAD_BOARD_FILTER_PARAMS: ReadonlyArray<string> = ['q', 'sort', 'lang', 'type'];
