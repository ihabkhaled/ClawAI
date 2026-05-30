import { ExecutionProfile } from '@/enums';

// Maps the runtime execution profile reported by local llama.cpp / ComfyUI
// (and inferred for cloud streams) to its i18n label key. Keys live under
// runtimeProgress.metrics.executionProfile.* in every locale. PR2 wires the
// real source; PR1 only the static mapping ships.
export const EXECUTION_PROFILE_LABEL_KEYS: Readonly<Record<ExecutionProfile, string>> = {
  [ExecutionProfile.CPU]: 'runtimeProgress.metrics.executionProfile.cpu',
  [ExecutionProfile.CUDA]: 'runtimeProgress.metrics.executionProfile.cuda',
  [ExecutionProfile.ROCM]: 'runtimeProgress.metrics.executionProfile.rocm',
  [ExecutionProfile.VULKAN]: 'runtimeProgress.metrics.executionProfile.vulkan',
  [ExecutionProfile.METAL]: 'runtimeProgress.metrics.executionProfile.metal',
  [ExecutionProfile.MIXED]: 'runtimeProgress.metrics.executionProfile.mixed',
  [ExecutionProfile.UNKNOWN]: 'runtimeProgress.metrics.executionProfile.unknown',
};

// Number of raw events the dev-only RuntimeRawEventsDrawer keeps in view.
// Older entries roll off so the drawer stays cheap to render even during
// long-running local runtime sessions.
export const RUNTIME_RAW_EVENTS_VISIBLE_LIMIT = 50;
