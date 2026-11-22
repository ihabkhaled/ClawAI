/** Where `extractEmbeddedStateText` found a page's script-shipped data. */
export enum EmbeddedStateSource {
  JSON_LD = 'JSON_LD',
  NEXT_DATA = 'NEXT_DATA',
  NUXT_DATA = 'NUXT_DATA',
  /** Any other `<script type="application/json">` block. */
  JSON_SCRIPT = 'JSON_SCRIPT',
  /** `window.__INITIAL_STATE__ = {…}` and its siblings (`WINDOW_STATE_NAMES`). */
  WINDOW_STATE = 'WINDOW_STATE',
  /** React Router / Remix turbo-stream (`__reactRouterContext.streamController.enqueue`). */
  REACT_ROUTER_STREAM = 'REACT_ROUTER_STREAM',
}
