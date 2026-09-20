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

/**
 * The version a worker script URL carries, or null when it has none.
 *
 * `registration.waiting.scriptURL` is the only handle on WHICH update is
 * waiting. Without it the update banner can only ask "is something waiting",
 * which is why it reappeared after every reload: a waiting worker stays
 * waiting until it is activated, so the answer stayed yes forever.
 */
export function serviceWorkerVersion(scriptUrl: string): string | null {
  try {
    return new URL(scriptUrl, window.location.origin).searchParams.get('v');
  } catch {
    return null;
  }
}

/**
 * Whether this update has already been put in front of this person.
 *
 * They saw the banner and reloaded without pressing Update — that is an
 * answer, and repeating the question on every page load is nagging. A
 * different version is a different question, so the banner returns for it.
 *
 * An unversioned worker is never suppressed: with nothing to compare, staying
 * quiet could hide every future update.
 */
export function isUpdateAlreadySeen(version: string | null, seen: string | null): boolean {
  return version !== null && seen !== null && version === seen;
}
