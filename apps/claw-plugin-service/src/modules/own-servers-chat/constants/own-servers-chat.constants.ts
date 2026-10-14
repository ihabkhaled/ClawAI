/** Notice codes plugin-service adds to a resolve answer when a mentioned own server cannot offer tools. */
export const RESOLVE_NOTICE_SERVER_UNAVAILABLE = 'PLUGIN_SERVER_UNAVAILABLE';
export const RESOLVE_NOTICE_SERVER_NEEDS_REVIEW = 'PLUGIN_SERVER_NEEDS_REVIEW';

/** How long one user's view of one own server (its approved tool snapshot) is reused in memory. */
export const OWN_SERVER_CACHE_TTL_MS = 30_000;

/** Most cached entries; the oldest is dropped first so memory stays bounded. */
export const OWN_SERVER_CACHE_MAX_ENTRIES = 500;

/** The whole own-server lookup of one resolve must finish inside this, or the turn goes on without it. */
export const OWN_SERVER_RESOLVE_DEADLINE_MS = 2_000;

/** Most own-server tools offered to the model in one message, whatever the servers hold. */
export const OWN_SERVER_TOOLS_MAX = 100;

/** The model sees at most this much of a server-written tool description. */
export const OWN_SERVER_DESCRIPTION_MAX = 300;

/** Longest server name shown in the system block and in the picker. */
export const OWN_SERVER_NAME_IN_BLOCK_MAX = 80;
export const OWN_SERVER_PICKER_NAME_MAX = 80;

/** The picker icon for a user's own server (the frontend falls back to a default for unknown keys). */
export const OWN_SERVER_ICON_KEY = 'mcp-server';

/** The local tool name pattern the snapshot manager enforces; re-checked on every read. */
export const OWN_SERVER_LOCAL_NAME_PATTERN = /^[a-z0-9_]{1,40}$/;

/** `plugin_<slug>_<tool>` must fit this many characters. */
export const OWN_SERVER_NATIVE_NAME_MAX = 64;

export const OWN_SERVER_MENTIONS_CACHE_CONTROL = 'private, no-store';

/** Line breaks, tabs and the two Unicode line separators: folded to a space before text reaches the model. */
export const MODEL_TEXT_LINE_BREAK_CODES: ReadonlySet<number> = new Set([
  9, 10, 13, 0x2028, 0x2029,
]);
export const MODEL_TEXT_SPACE_RUNS = / {2,}/gu;
