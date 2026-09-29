/**
 * The worker's script URL, carrying the app version.
 *
 * A release therefore installs a new worker, whose `activate` drops every
 * older cache. With one constant script URL and one constant cache name, a
 * previous build's assets could be served indefinitely (TD-034).
 */
export function serviceWorkerUrl(version: string): string {
  return `/sw.js?v=${encodeURIComponent(version)}`;
}

/**
 * Whether a service worker should be registered at all.
 *
 * Never in development: a dev build reuses chunk URLs, so a cached chunk is
 * served for code that has changed, and every local verification then
 * measures the previous bundle.
 */
export function shouldRegisterServiceWorker(environment: string | undefined): boolean {
  return environment === 'production';
}
