// ComfyUI WebSocket + REST adapter constants.
export const COMFYUI_MAX_EXECUTION_MS = 5 * 60 * 1000;
export const COMFYUI_WS_OPEN_TIMEOUT_MS = 5_000;
export const COMFYUI_PROMPT_POST_TIMEOUT_MS = 10_000;
export const COMFYUI_HISTORY_GET_TIMEOUT_MS = 10_000;
export const COMFYUI_VIEW_GET_TIMEOUT_MS = 30_000;
export const COMFYUI_INTERRUPT_TIMEOUT_MS = 5_000;
export const COMFYUI_WS_RECONNECT_MAX_ATTEMPTS = 2;
export const COMFYUI_WS_RECONNECT_BACKOFF_MS = 750;
export const COMFYUI_COMPLETION_POLL_MS = 200;

export const COMFYUI_WS_EVENT_STATUS = 'status';
export const COMFYUI_WS_EVENT_EXECUTION_START = 'execution_start';
export const COMFYUI_WS_EVENT_EXECUTION_CACHED = 'execution_cached';
export const COMFYUI_WS_EVENT_EXECUTION_ERROR = 'execution_error';
export const COMFYUI_WS_EVENT_EXECUTING = 'executing';
export const COMFYUI_WS_EVENT_PROGRESS = 'progress';
export const COMFYUI_WS_EVENT_EXECUTED = 'executed';
