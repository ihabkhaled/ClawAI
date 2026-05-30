import type { AiStreamProgressConfidence, ExecutionProfile } from '@/enums';

// Re-export the ExecutionProfile enum as a value-less type alias so
// type-only consumers continue to import from `@/types`. The enum itself
// remains the single source of truth in `@/enums/execution-profile.enum`.
export type { ExecutionProfile };

// Runtime-neutral metrics shape used by RuntimeMetricsHud. This is the
// forward-looking superset of the cloud-only StreamMetrics — it lets PR2
// pass per-layer offload counts and KV-cache pressure from llama.cpp
// without disturbing the cloud streaming code path. PR1 never instantiates
// this shape; only the type is consumed at compile time so the HUD can
// accept either source.
export type RuntimeProgressMetrics = {
  elapsedMs: number;
  timeToFirstTokenMs?: number;
  tokensPerSecond?: number;
  generatedTokens: number;
  estimatedTotalOutputTokens?: number;
  progressPercent: number;
  progressConfidence: AiStreamProgressConfidence;
  estimatedCostUsd?: number;
  // PR2 — populated by llama.cpp / ComfyUI adapters when running locally.
  // Cloud providers leave these undefined so the HUD falls back to the
  // cloud-only StreamMetrics rendering path.
  layersOnGpu?: number;
  totalLayers?: number;
  kvCacheBytes?: number;
  contextUsedTokens?: number;
  contextMaxTokens?: number;
};
