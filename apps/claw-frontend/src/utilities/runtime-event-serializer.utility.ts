// Serialises an arbitrary runtime event payload for display in the dev-only
// RuntimeRawEventsDrawer. Wraps JSON.stringify so callers do not have to
// handle the (rare) cyclic-reference TypeError directly; the drawer is a
// debug surface and should never crash the live progress panel when a
// future event payload happens to be cyclic. The returned string is the
// pretty-printed JSON form, or — if serialization fails — the best-effort
// `String(value)` fallback so something still renders.
export function serializeRuntimeEvent(event: unknown): string {
  try {
    return JSON.stringify(event, null, 2);
  } catch {
    return String(event);
  }
}
