import { SECRET_URL_PARAM_NAMES, URL_SECRET_PLACEHOLDER } from './redact-url-secrets.constants';

const SECRET_PARAM_PATTERN = new RegExp(
  `([?&;](?:${SECRET_URL_PARAM_NAMES.map((name) => name.replaceAll('-', '\\-')).join('|')})=)[^&#\\s"'<>]*`,
  'gi',
);

/**
 * Replaces the value of credential-bearing query parameters with `[REDACTED]`.
 *
 * Works on a URL or on any text that embeds one (an error message), so log
 * lines never carry a provider key that a caller put in the query string.
 */
export function redactUrlSecrets(text: string): string {
  return text.replace(SECRET_PARAM_PATTERN, `$1${URL_SECRET_PLACEHOLDER}`);
}
