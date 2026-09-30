// LLM-gateway headers on a connector (F092). Mirrors the connector-service
// validator in `apps/claw-connector-service/src/modules/connectors/constants/
// gateway-headers.constants.ts` so the admin sees a bad row before the round
// trip; the server stays the authority and re-validates every write.

export const GATEWAY_HEADERS_MAX_COUNT = 10;
export const GATEWAY_HEADER_VALUE_MAX_LENGTH = 1000;

// RFC 9110 token characters, 1..100 long.
export const GATEWAY_HEADER_NAME_PATTERN = /^[!#$%&'*+.^_`|~0-9A-Za-z-]{1,100}$/;

// CR/LF or NUL in a value is header injection.
export const GATEWAY_HEADER_VALUE_FORBIDDEN_PATTERN = /[\r\n\0]/;

// Names the connector owns (its own credential and transport headers),
// compared lower-case. A gateway header can never replace the provider key.
export const GATEWAY_HEADER_FORBIDDEN_NAMES: ReadonlySet<string> = new Set([
  'authorization',
  'x-api-key',
  'x-goog-api-key',
  'api-key',
  'anthropic-version',
  'anthropic-workspace-id',
  'host',
  'content-length',
  'content-type',
  'connection',
  'transfer-encoding',
  'cookie',
  'proxy-authorization',
  'te',
  'upgrade',
  'keep-alive',
]);

// Example header name shown in the empty name input. A technical token, not
// prose, so it is not translated.
export const GATEWAY_HEADER_NAME_PLACEHOLDER = 'x-portkey-config';
