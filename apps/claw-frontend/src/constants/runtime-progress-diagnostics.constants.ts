import type { RuntimeProbeCapabilities } from '@/types';

// Static label mapping for the capabilities checklist rendered on the admin
// runtime-progress diagnostics page. Kept as a constants file because TSX
// components are not allowed to declare module-level constants per the
// frontend ESLint contract.
export type RuntimeProbeCapabilityLabel = {
  key: keyof RuntimeProbeCapabilities;
  labelKey: string;
};

export const RUNTIME_PROBE_CAPABILITY_LABELS: ReadonlyArray<RuntimeProbeCapabilityLabel> = [
  { key: 'streamingText', labelKey: 'runtimeProgress.diagnostics.capabilities.streamingText' },
  { key: 'thinking', labelKey: 'runtimeProgress.diagnostics.capabilities.thinking' },
  { key: 'promptProgress', labelKey: 'runtimeProgress.diagnostics.capabilities.promptProgress' },
  { key: 'nodeProgress', labelKey: 'runtimeProgress.diagnostics.capabilities.nodeProgress' },
  { key: 'stepProgress', labelKey: 'runtimeProgress.diagnostics.capabilities.stepProgress' },
  { key: 'cancel', labelKey: 'runtimeProgress.diagnostics.capabilities.cancel' },
  { key: 'metrics', labelKey: 'runtimeProgress.diagnostics.capabilities.metrics' },
];

// Number of recent runtime events to keep on the card. The drawer below the
// card still shows the full event stream — this is just the "at-a-glance"
// summary.
export const RUNTIME_PROBE_RECENT_EVENTS_LIMIT = 5;

// Number of models to keep in the always-expanded models list before
// collapsing the tail behind a "show more" affordance. PR5 keeps this simple
// and just renders up to the limit; pagination is a follow-up.
export const RUNTIME_PROBE_MODELS_PREVIEW_LIMIT = 8;
