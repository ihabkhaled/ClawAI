// LLM-gateway headers (F092). An operator may attach extra request headers to a
// connector so it can sit behind LiteLLM, Portkey, Helicone, Cloudflare AI
// Gateway or a Bedrock/Vertex proxy.

// A gateway needs one to three headers in practice; ten is a ceiling on abuse,
// not a product limit.
export const GATEWAY_HEADERS_MAX_COUNT = 10;
export const GATEWAY_HEADER_VALUE_MAX_LENGTH = 1000;

// RFC 9110 token characters, 1..100 long.
export const GATEWAY_HEADER_NAME_PATTERN = /^[!#$%&'*+.^_`|~0-9A-Za-z-]{1,100}$/;

// CR/LF or NUL in a value is header injection.
export const GATEWAY_HEADER_VALUE_FORBIDDEN_PATTERN = /[\r\n\0]/;

// Names a gateway header may never set, compared lower-case. The provider's own
// credential headers stay owned by the connector's API key — a gateway header
// that silently replaced them would make the stored key a lie — and the
// transport headers belong to fetch. Anthropic's version header is pinned by
// the adapter (see ANTHROPIC_VERSION).
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
