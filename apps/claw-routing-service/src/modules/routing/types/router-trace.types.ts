/**
 * Per-request trace bookkeeping.
 *
 * `sequence` lives here, not in a module-level counter, so two concurrent
 * requests cannot interleave their numbering — the exact defect the legacy
 * per-process SSE counter has once a second replica exists.
 */
export interface RouterTraceContext {
  traceId: string;
  requestId: string;
  threadId: string | null;
  sequence: number;
}
