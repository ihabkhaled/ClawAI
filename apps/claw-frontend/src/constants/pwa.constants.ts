// Persisted so "never show again" survives a reload; the install prompt is the
// only PWA row the user can dismiss permanently.
export const PWA_INSTALL_DISMISSED_KEY = 'claw.pwa.install.dismissed';

/**
 * Every cache the service worker owns starts with this. `public/sw.js`
 * repeats the literal, because a worker script cannot import.
 */
export const PWA_CACHE_PREFIX = 'clawai-shell-';
