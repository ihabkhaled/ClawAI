import type { ValidationLimits } from '../../installs/types/settings-validation.types';

export const CALL_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.:-]{7,99}$/;
export const SURFACE_PATTERN = /^[a-z][a-z0-9:_-]{0,39}$/;
export const ID_FIELD_MAX = 100;

/** Tool arguments are model-written and can be long (a document body); settings cannot. */
export const TOOL_ARGUMENT_LIMITS: ValidationLimits = {
  maxBytes: 32_768,
  maxDepth: 6,
  maxArrayItems: 500,
  maxStringLength: 16_000,
};

export const ARGS_PREVIEW_MAX = 512;
export const ARGS_PREVIEW_STRING_MAX = 120;
export const ARGS_PREVIEW_MAX_DEPTH = 6;
export const REDACTED = '[redacted]';
export const SENSITIVE_KEY_PATTERN = /pass|secret|token|key|auth|credential|cookie|session/i;
export const LONG_TOKEN_PATTERN = /[A-Za-z0-9_-]{32,}/g;

export const RESULT_FENCE_TAG = 'tool_result';
export const RESULT_FENCE_ESCAPE = /<\s{0,8}\/?\s{0,8}tool_result/gi;
export const UTF8_REPLACEMENT = '�';

export const RATE_WINDOW_MS = 60_000;
export const QUOTA_REQUEST_PREFIX = 'plugin-call:';
export const QUOTA_FEATURE = 'PLUGIN_CALLS';
export const QUOTA_TIMEOUT_MS = 5000;
export const QUOTA_RESERVE_PATH = '/api/v1/internal/quota/features/reserve';
export const QUOTA_SETTLE_PATH = '/api/v1/internal/quota/features/settle';
export const INVOKE_CACHE_CONTROL = 'no-store';

export const WEB_FETCH_MAX_BYTES = 1_000_000;
export const WEB_FETCH_USER_AGENT = 'ClawAI-PluginFetch/1.0';
export const WEB_FETCH_ACCEPT =
  'text/html, text/plain, application/xhtml+xml, application/json;q=0.8, */*;q=0.1';
export const WEB_FETCH_REDIRECTS = 3;
export const WEB_FETCH_PORTS: readonly number[] = [443];

/** After the tool deadline, how long an executor that ignores the abort signal is given before the call is cut off. */
export const HARD_TIMEOUT_GRACE_MS = 1000;
