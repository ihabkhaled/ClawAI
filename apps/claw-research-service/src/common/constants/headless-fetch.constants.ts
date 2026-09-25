/**
 * `HeadlessFetchAdapter`'s own bounds — separate from `fetch.constants.ts`
 * because a rendered page runs on a genuinely different cost/timing profile
 * than a plain HTTP GET: it boots a browser, executes the page's own
 * JavaScript, and only then has a DOM worth reading.
 */

/** Wall-clock budget for one page to finish navigating (the `load` event). */
export const HEADLESS_RENDER_NAVIGATION_TIMEOUT_MS = 15_000;

/**
 * After `load`, how long to wait for the network to go idle so late XHR
 * content lands. Bounded: a page holding a socket open never goes idle.
 */
export const HEADLESS_IDLE_WAIT_MS = 5_000;

/**
 * Resource types aborted for every headless request, including the initial
 * navigation's own subresources. Two independent reasons, not one:
 * scraping needs the DOM's text, never a rendered pixel, so these buy
 * nothing; and each one is a subrequest this adapter would otherwise have
 * to run through the anti-SSRF check for no benefit.
 */
export const HEADLESS_BLOCKED_RESOURCE_TYPES: ReadonlySet<string> = new Set([
  'image',
  'media',
  'font',
  'stylesheet',
]);

/** Hard cap on the rendered HTML's own byte length, mirroring FETCH_MAX_BYTES. */
export const HEADLESS_RENDER_MAX_BYTES = 4 * 1024 * 1024;
