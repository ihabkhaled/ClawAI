const REDACTED_KEYS = new Set([
  'password',
  'token',
  'apiKey',
  'apikey',
  'refreshToken',
  'accessToken',
  'secret',
  'authorization',
  'cookie',
  'clientSecret',
]);

const REDACTED_PLACEHOLDER = '[REDACTED]';

function redactValue(_key: string, value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }
  if (typeof value !== 'object') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item, index) => redactValue(String(index), item));
  }
  const obj = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(obj)) {
    out[k] = REDACTED_KEYS.has(k.toLowerCase()) ? REDACTED_PLACEHOLDER : redactValue(k, obj[k]);
  }
  return out;
}

/**
 * JSON.stringify variant that redacts known sensitive fields (token, password,
 * apiKey, refreshToken, accessToken, secret, authorization, cookie,
 * clientSecret). Use in logger.debug calls when the input may contain auth
 * material.
 */
export function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(redactValue('', value));
  } catch {
    return '[unstringifiable]';
  }
}
