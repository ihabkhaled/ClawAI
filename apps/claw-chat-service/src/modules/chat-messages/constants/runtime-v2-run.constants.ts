// How long a run's Redis state survives without a mutation refreshing it.
//
// Every mutation bumps the TTL, so 15 minutes was ample for a run that reads
// and patches. It is not ample for one that runs a real command: the keys are
// refreshed when a tool is ADMITTED, not while it executes, so a single long
// call spends the whole window in one go. `git commit` here runs the repo's
// pre-commit hook — lint-staged, knowledge regeneration, then typecheck across
// every touched workspace — which takes minutes, and the run died as
// RUNTIME_STATE_UNAVAILABLE at exactly that step three times in a row, after
// the tool had already succeeded. The work was done and the result had nowhere
// to land.
//
// An hour covers the slowest legitimate command in this repo with room to
// spare, and the TTL is still a backstop against orphaned runs rather than a
// budget: `maxToolCalls` and the model-turn budget are what actually bound a
// run's cost.
export const RUNTIME_V2_ACTIVE_TTL_SECONDS = 3_600;

// A continuation turn reads this many recent messages. Each tool call adds two
// transcript entries (the request and its result), so the old window of 20 was
// entirely consumed by tool traffic on any task making more than ~9 calls. The
// window is wider now, and the run's originating message is pinned separately
// so the user's question survives however long the tool trail gets.
export const RUNTIME_V2_CONTINUATION_HISTORY_MESSAGES = 40;
