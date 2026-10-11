/**
 * Query-parameter names whose value is a credential. Matched case-insensitively
 * and exactly, so `monkey=1` is not touched but `key=...` and `x-goog-api-key=...` are.
 */
export const SECRET_URL_PARAM_NAMES: readonly string[] = [
  'key',
  'api_key',
  'apikey',
  'api-key',
  'x-api-key',
  'x-goog-api-key',
  'token',
  'access_token',
  'refresh_token',
  'id_token',
  'auth',
  'authorization',
  'secret',
  'client_secret',
  'signature',
  'sig',
  'password',
];

export const URL_SECRET_PLACEHOLDER = '[REDACTED]';
