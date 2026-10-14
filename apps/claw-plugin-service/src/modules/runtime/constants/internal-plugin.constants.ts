/** Most plugins one message may mention (chat-service enforces the same cap). */
export const INTERNAL_RESOLVE_REFS_MAX = 5;

/** What chat-service reads from `limits` when no admin value is stored. */
export const RESOLVE_NOTICE_NO_TOOLS = 'PLUGIN_NO_TOOLS';

/** Most characters of one plugin's description that go into the system block. */
export const RESOLVE_SYSTEM_BLOCK_DESCRIPTION_MAX = 300;
