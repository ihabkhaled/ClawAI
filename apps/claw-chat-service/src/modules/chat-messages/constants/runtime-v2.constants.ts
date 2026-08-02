export const RUNTIME_V2_SCHEMA_VERSION = '2.0';
export const RUNTIME_V2_ID_PATTERN = /^[A-Za-z][A-Za-z0-9_.:-]{7,127}$/u;
export const RUNTIME_V2_SHA256_PATTERN = /^sha256:[a-f0-9]{64}$/u;
export const RUNTIME_V2_TOOL_NAME_PATTERN = /^[a-z][a-z0-9_.-]+$/u;
export const RUNTIME_V2_OPERATION_PATTERN = /^[a-z][a-z0-9_.-]*$/u;
export const RUNTIME_V2_ERROR_CODE_PATTERN = /^[A-Z][A-Z0-9_]{2,79}$/u;
export const RUNTIME_V2_EVENT_TYPE_PATTERN = /^[a-z][a-z0-9-]{0,58}\.[a-z][a-z0-9.-]{0,58}$/u;
export const RUNTIME_V2_REDIS_PREFIX = 'chat:runtime:v2:{runtime-v2}';
export const RUNTIME_V2_JSON_DEPTH = 8;
export const RUNTIME_V2_JSON_ENTRIES = 100;
export const RUNTIME_V2_JSON_KEY_CHARACTERS = 120;
export const RUNTIME_V2_JSON_STRING_CHARACTERS = 65_536;
export const RUNTIME_V2_PROMPT_BYTES = 32_768;
export const RUNTIME_V2_STEERING_BYTES = 32_768;
export const RUNTIME_V2_ARGUMENT_BYTES = 262_144;
export const RUNTIME_V2_TOOL_CATALOG_BYTES = 2_097_152;
export const RUNTIME_V2_TOOL_CATALOG_ENTRIES = 256;
export const RUNTIME_V2_RESULT_BYTES = 1_048_576;
export const RUNTIME_V2_ERROR_DETAIL_BYTES = 32_768;
export const RUNTIME_V2_MAX_CURSOR = 9_007_199_254_740_991;

export const RUNTIME_V2_RISK_CLASSES = [
  'inspect',
  'workspace-write',
  'external-write',
  'network',
  'process',
  'git-mutate',
  'container-mutate',
  'database-read',
  'database-write',
  'browser',
  'elevation',
  'publish',
  'destructive',
] as const;

export const RUNTIME_V2_RESULT_STATUSES = [
  'succeeded',
  'failed',
  'denied',
  'cancelled',
  'timed-out',
] as const;
