// Persisted so "never show again" survives a reload; the install prompt is the
// only PWA row the user can dismiss permanently.
export const PWA_INSTALL_DISMISSED_KEY = 'claw.pwa.install.dismissed';

/**
 * Every cache the service worker owns starts with this. `public/sw.js`
 * repeats the literal, because a worker script cannot import.
 */
export const PWA_CACHE_PREFIX = 'clawai-shell-';

/**
 * The update version this person has already been shown.
 *
 * Persisted, because the complaint is specifically about a reload: the banner
 * asked again every time the page loaded, for an update they had already
 * declined by reloading past it.
 */
export const PWA_UPDATE_SEEN_KEY = 'claw.pwa.update.seen';

/**
 * How often an open page asks whether a new version has been deployed.
 *
 * The browser only re-checks a worker script on navigation, so a tab left open
 * never noticed a deploy — the banner appeared on the NEXT reload, which is
 * the moment it is least useful. Five minutes is one small request per tab per
 * five minutes, and the check stops as soon as an update is found and while
 * the tab is hidden, so a backgrounded tab costs nothing.
 */
export const PWA_UPDATE_CHECK_INTERVAL_MS = 5 * 60 * 1000;
