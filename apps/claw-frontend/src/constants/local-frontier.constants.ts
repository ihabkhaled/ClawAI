export const POLL_INTERVAL_MS = 2000;
export const SSE_RECONNECT_MAX = 3;
export const SSE_RECONNECT_BACKOFF_MS = 2000;

export const ALL_FILTER_VALUE = '__ALL__';

export const RUNTIME_CONFIG_MIN_CTX = 512;
export const RUNTIME_CONFIG_MAX_CTX = 1_048_576;
export const RUNTIME_CONFIG_MIN_THREADS = 1;
export const RUNTIME_CONFIG_MAX_THREADS = 256;
export const RUNTIME_CONFIG_MIN_GPU_LAYERS = 0;
export const RUNTIME_CONFIG_MAX_GPU_LAYERS = 999;

export const DEFAULT_RUNTIME_CONFIG_DRAFT = Object.freeze({
  nGpuLayers: null,
  ctxSize: 8192,
  cpuMoe: false,
  threads: null,
  customArgs: null,
}) as Readonly<{
  nGpuLayers: number | null;
  ctxSize: number;
  cpuMoe: boolean;
  threads: number | null;
  customArgs: string | null;
}>;

export const COMPAT_BADGE_TONE: Readonly<Record<string, string>> = Object.freeze({
  FITS: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  WARNS: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  REFUSES: 'bg-rose-500/15 text-rose-700 dark:text-rose-300',
});

export const QUALITY_TIER_BADGE: Readonly<Record<string, string>> = Object.freeze({
  SURVIVAL: 'bg-rose-500/15 text-rose-700 dark:text-rose-300',
  BALANCED: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  BEST: 'bg-violet-500/15 text-violet-700 dark:text-violet-300',
});

export const LOCAL_FRONTIER_API_BASE = '/api/v1/llamacpp';
