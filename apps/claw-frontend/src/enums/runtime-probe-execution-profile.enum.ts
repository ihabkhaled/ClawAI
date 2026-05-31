// Mirrors @claw/shared-types RuntimeProbeExecutionProfile. Uppercase enum
// string from the backend — the FE keeps its own ExecutionProfile enum
// (lowercase) used by stream metrics. Diagnostics reports use the BE shape
// directly to avoid lossy mapping. Sync with
// packages/shared-types/src/runtime-progress/runtime-probe-report.types.ts.
export enum RuntimeProbeExecutionProfile {
  CPU = 'CPU',
  CUDA = 'CUDA',
  ROCM = 'ROCM',
  VULKAN = 'VULKAN',
  METAL = 'METAL',
  MIXED = 'MIXED',
  UNKNOWN = 'UNKNOWN',
}
