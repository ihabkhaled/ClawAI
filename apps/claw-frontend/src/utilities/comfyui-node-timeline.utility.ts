import type { ClawRuntimeProgressEnvelope } from '@/types/runtime-progress-envelope.types';
import type {
  ComfyUINodeTimelineEntry,
  ComfyUINodeTimelineStatus,
} from '@/types/comfyui-node-timeline.types';

// COMFYUI provider literal. We accept either the BE enum string or the
// lowercase variant to keep the FE robust to enum drift.
const COMFYUI_PROVIDER_VALUES: ReadonlySet<string> = new Set(['COMFYUI', 'comfyui']);

const STAGE_EXECUTING_NODE = 'EXECUTING_NODE';
const STAGE_NODE_COMPLETED = 'NODE_COMPLETED';
const STAGE_MODEL_WARMING_UP = 'MODEL_WARMING_UP';
const RAW_EVENT_EXECUTION_CACHED = 'execution_cached';

/**
 * True when the envelope was produced by the ComfyUI adapter. Used by
 * the image progress panel to decide whether to render the node
 * timeline.
 */
export function isComfyUIProgressEnvelope(
  envelope: ClawRuntimeProgressEnvelope | null | undefined,
): boolean {
  if (!envelope) {
    return false;
  }
  return COMFYUI_PROVIDER_VALUES.has(envelope.provider);
}

/**
 * Fold an ordered stream of envelopes into a stable node timeline. The
 * algorithm walks the events oldest-first, ensures each `nodeId` we see
 * has an entry, and updates its status as `NODE_COMPLETED` / `EXECUTING_NODE`
 * envelopes arrive. `execution_cached` envelopes set a recency flag we
 * use to tag the next-seen node as `cached`.
 *
 * The function is pure — same input always produces the same output —
 * so the React component can call it on every render without memoization.
 */
export function deriveComfyUITimeline(
  events: ReadonlyArray<ClawRuntimeProgressEnvelope>,
): ComfyUINodeTimelineEntry[] {
  const byNodeId = new Map<string, ComfyUINodeTimelineEntry>();
  const ordering: string[] = [];
  let lastCachedAtMs: number | null = null;
  for (const evt of events) {
    if (
      evt.stage === STAGE_MODEL_WARMING_UP &&
      evt.rawProviderEventType === RAW_EVENT_EXECUTION_CACHED
    ) {
      lastCachedAtMs = evt.createdAtMs;
      continue;
    }
    if (!evt.nodeId) {
      continue;
    }
    const existing = byNodeId.get(evt.nodeId);
    if (!existing) {
      const wasCached =
        lastCachedAtMs !== null && Math.abs(evt.createdAtMs - lastCachedAtMs) < 50;
      const entry: ComfyUINodeTimelineEntry = {
        nodeId: evt.nodeId,
        label: evt.nodeName ?? evt.nodeId,
        status: deriveStatus(evt.stage),
        cached: wasCached,
      };
      byNodeId.set(evt.nodeId, entry);
      ordering.push(evt.nodeId);
      continue;
    }
    if (evt.stage === STAGE_NODE_COMPLETED) {
      existing.status = 'completed';
    } else if (evt.stage === STAGE_EXECUTING_NODE && existing.status !== 'completed') {
      existing.status = 'executing';
    }
    if (evt.nodeName) {
      existing.label = evt.nodeName;
    }
  }
  return ordering
    .map((id) => byNodeId.get(id))
    .filter((entry): entry is ComfyUINodeTimelineEntry => entry !== undefined);
}

function deriveStatus(stage: string): ComfyUINodeTimelineStatus {
  if (stage === STAGE_NODE_COMPLETED) {
    return 'completed';
  }
  if (stage === STAGE_EXECUTING_NODE) {
    return 'executing';
  }
  return 'pending';
}
