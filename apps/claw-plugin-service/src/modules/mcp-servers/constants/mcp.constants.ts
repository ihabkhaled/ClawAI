/** Newest first. The server picks one in `initialize`; anything else is refused. */
export const MCP_SUPPORTED_PROTOCOL_VERSIONS: readonly string[] = [
  '2025-06-18',
  '2025-03-26',
  '2024-11-05',
];
export const MCP_CLIENT_INFO = { name: 'clawai-plugin-service', version: '1.0.0' } as const;
export const MCP_USER_AGENT = 'ClawAI-Plugins/1.0';

export const MCP_TOOLS_LIST_MAX_BYTES = 524_288;
export const MCP_MAX_TOOLS = 64;
export const MCP_MAX_LIST_PAGES = 4;
export const MCP_CURSOR_MAX = 512;
export const MCP_DISCOVERY_TIMEOUT_MS = 15_000;
export const MCP_HANDSHAKE_TIMEOUT_MS = 10_000;
export const MCP_ARGUMENTS_MAX_BYTES = 32_768;
export const MCP_RESPONSE_OVERHEAD_BYTES = 8192;
export const MCP_RESPONSE_MAX_BYTES = 2_097_152;
/** The wire size of a result can be several times its text: JSON escaping, and several content blocks. */
export const MCP_RESPONSE_EXPANSION = 4;

export const MCP_REMOTE_TOOL_NAME_PATTERN = /^[A-Za-z0-9_.:-]{1,128}$/;
export const MCP_SESSION_ID_PATTERN = /^[!-~]{1,128}$/;
export const MCP_TOOL_DESCRIPTION_MAX = 1024;
export const MCP_SERVER_NAME_MAX = 80;
export const MCP_SERVER_INFO_FIELD_MAX = 80;
export const MCP_SKIPPED_NAME_DISPLAY_MAX = 64;

export const MCP_SLUG_PREFIX = 'mcp';
export const MCP_SLUG_HEX_LENGTH = 8;
export const LOCAL_TOOL_NAME_MAX = 40;

/** A server that fails this many calls in a row stops being called until the half-open probe. */
export const BREAKER_FAILURE_THRESHOLD = 5;
export const BREAKER_HALF_OPEN_AFTER_MS = 30_000;

export const MCP_HEADER_SESSION = 'mcp-session-id';
export const MCP_HEADER_PROTOCOL = 'MCP-Protocol-Version';
export const MCP_DEFAULT_API_KEY_HEADER = 'X-API-Key';
export const MCP_BEARER_HEADER = 'Authorization';
export const MCP_BEARER_PREFIX = 'Bearer ';

/** Headers the client sets itself; a stored credential header may never shadow one of them. */
export const MCP_RESERVED_REQUEST_HEADERS: readonly string[] = [
  'content-type',
  'accept',
  'user-agent',
  'mcp-protocol-version',
  'mcp-session-id',
];

export const SERVER_CREDENTIAL_VALUE_MAX = 4096;
export const SERVERS_LIST_MAX = 100;
export const SERVER_TOOLS_PATCH_MAX = 64;
export const SERVER_CACHE_CONTROL = 'private, no-store';
export const SERVER_ERROR_DETAIL_MAX = 200;

export const MCP_HANDSHAKE_BYTES = 65_536;
export const MCP_NOTIFICATION_MAX_BYTES = 16_384;
export const MCP_ERROR_TEXT_MAX = 1000;

export const SERVER_OUTBOUND_THROTTLE = { limit: 10, ttl: 60_000 } as const;
