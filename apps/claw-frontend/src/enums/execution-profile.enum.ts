// Execution profile reported by local runtimes (llama.cpp / ComfyUI) and
// inferred for cloud streams. `MIXED` covers CPU-offloaded GPU runs where
// some layers stay on the host; `UNKNOWN` is the safe fallback before the
// runtime has identified itself. Cloud streams leave the profile undefined
// so the metrics HUD only renders the badge when locally known.
export enum ExecutionProfile {
  CPU = 'cpu',
  CUDA = 'cuda',
  ROCM = 'rocm',
  VULKAN = 'vulkan',
  METAL = 'metal',
  MIXED = 'mixed',
  UNKNOWN = 'unknown',
}
