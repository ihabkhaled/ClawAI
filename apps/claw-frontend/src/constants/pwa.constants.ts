// Persisted so "never show again" survives a reload; the install prompt is the
// only PWA row the user can dismiss permanently.
export const PWA_INSTALL_DISMISSED_KEY = 'claw.pwa.install.dismissed';

/**
 * Every cache the service worker owns starts with this. `public/sw.js`
 * repeats the literal, because a worker script cannot import.
 */
export const PWA_CACHE_PREFIX = 'clawai-shell-';

/**
 * How often an open page asks whether a new version has been deployed.
 *
 * One small no-store request per visible tab per five minutes; a hidden tab
 * does not ask, and becoming visible asks at once.
 */
export const PWA_UPDATE_CHECK_INTERVAL_MS = 5 * 60 * 1000;

/**
 * Answers with the version the server is running now (`app/api/version`).
 *
 * The banner compares this with the page's own build-time `APP_VERSION`. The
 * service worker cannot answer that question: `sw.js` is byte-identical across
 * releases (the version is only a query string), so `registration.update()`
 * from an open tab re-fetched the same script and never found anything.
 */
export const PWA_VERSION_ENDPOINT = '/api/version';
