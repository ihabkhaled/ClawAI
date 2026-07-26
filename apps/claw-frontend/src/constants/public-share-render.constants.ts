/**
 * Longest single message body we will parse and render on a public page.
 *
 * The bound exists because markdown parsing is superlinear on pathological input
 * (deeply nested emphasis, thousands of table cells) and this runs on a request
 * path an unauthenticated stranger can hit. 40 000 characters is roughly ten
 * thousand words — far past any real message — so the cap is invisible in
 * practice and finite in the worst case.
 */
export const PUBLIC_MESSAGE_MAX_RENDER_CHARS = 40_000;

/**
 * Longest whole conversation we will render.
 *
 * A share snapshot is already capped server-side, but the page adds its own bound
 * so a future change to that cap cannot turn one URL into an unbounded render.
 */
export const PUBLIC_SHARE_MAX_RENDERED_MESSAGES = 500;
