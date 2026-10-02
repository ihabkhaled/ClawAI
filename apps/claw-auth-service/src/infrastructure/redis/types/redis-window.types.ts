/**
 * One hit on a fixed-window counter: the count INCLUDING this hit, and how many
 * seconds remain before the window resets. `ttlSeconds` is what a 429 sends as
 * `Retry-After`.
 */
export type FixedWindowHit = {
  count: number;
  ttlSeconds: number;
};
