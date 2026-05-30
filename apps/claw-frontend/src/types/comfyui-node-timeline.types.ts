// PR4 — Frontend types for the ComfyUI node-timeline UI.

import type { ClawRuntimeProgressEnvelope } from './runtime-progress-envelope.types';

// Single row in the rendered node timeline. The reducer that derives
// timeline state from an event stream produces a stable array of these
// descriptors so the React component never has to track its own state.
export type ComfyUINodeTimelineEntry = {
  nodeId: string;
  /** Friendly label like "Sampling", "VAE decode". Falls back to nodeId. */
  label: string;
  status: ComfyUINodeTimelineStatus;
  /** Cached nodes show a "cached" pill instead of a step counter. */
  cached: boolean;
};

export type ComfyUINodeTimelineStatus = 'pending' | 'executing' | 'completed';

export type ComfyUINodeTimelineProps = {
  /**
   * Ordered, monotonically-increasing list of envelopes for this run.
   * The component derives status + cached + index from the array; it
   * does not mutate the input.
   */
  events: ReadonlyArray<ClawRuntimeProgressEnvelope>;
  className?: string;
};
