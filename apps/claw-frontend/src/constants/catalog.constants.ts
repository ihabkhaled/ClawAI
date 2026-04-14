export const MODEL_CATEGORY_LABELS: Record<string, string> = {
  CODING: 'Coding',
  FILE_GENERATION: 'File Generation',
  IMAGE_GENERATION: 'Image Generation',
  ROUTING: 'Routing',
  REASONING: 'Reasoning',
  THINKING: 'Thinking & Search',
  GENERAL: 'General',
};

export const MODEL_CATEGORIES = [
  'CODING',
  'FILE_GENERATION',
  'IMAGE_GENERATION',
  'ROUTING',
  'REASONING',
  'THINKING',
  'GENERAL',
] as const;

export const PULL_JOB_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  IN_PROGRESS: 'Downloading...',
  COMPLETED: 'Installed',
  FAILED: 'Failed',
};

export const MODEL_RUNTIME_LABELS: Record<string, string> = {
  OLLAMA: 'Ollama',
  COMFYUI: 'ComfyUI',
};

export const MODEL_RUNTIME_BADGE_CLASSES: Record<string, string> = {
  OLLAMA: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  COMFYUI: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
};

export const PULL_JOB_POLL_INTERVAL_MS = 3000;

export const DOWNLOAD_STATS_TICK_INTERVAL_MS = 1000;

export const CATALOG_PAGE_SIZE = 20;
