export const RUNTIME_V2_ACTIVE_TTL_SECONDS = 900;

// A continuation turn reads this many recent messages. Each tool call adds two
// transcript entries (the request and its result), so the old window of 20 was
// entirely consumed by tool traffic on any task making more than ~9 calls. The
// window is wider now, and the run's originating message is pinned separately
// so the user's question survives however long the tool trail gets.
export const RUNTIME_V2_CONTINUATION_HISTORY_MESSAGES = 40;
