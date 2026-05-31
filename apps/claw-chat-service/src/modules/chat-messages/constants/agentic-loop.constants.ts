// Caps for the Ollama Cloud agentic tool-call loop.
//
// Ollama Cloud agentic models (deepseek-v4-pro, kimi-k2, GLM-5.1, …) emit
// `message.tool_calls` in their /api/chat responses. The client (this
// service) is responsible for executing those tools against
// /api/web_search and /api/web_fetch, appending the results as `tool`
// messages, and re-POSTing /api/chat until the model returns an empty
// `tool_calls` array.
//
// These caps bound the loop so a degenerate model that keeps emitting
// tool calls forever cannot wedge the chat thread.
//
// Source: https://docs.ollama.com/capabilities/web-search

// Maximum number of model turns we will execute before bailing with a
// "cap-reached" marker in `metadata.toolTranscript`.
//
// Runtime source-of-truth: AppConfig.get().OLLAMA_TOOL_LOOP_MAX_ITERATIONS
// (env-overridable). This constant is the *default* baked into the
// validation schema so test fixtures and out-of-band callers (e.g. the
// graceful-wrap-up cap-reached message) have a stable value to reference.
// Raised 10 → 50 (2026-05-31, foundation step) so deeper agentic chains
// (kimi-k2 / deepseek-v4-pro / glm-5.1) can complete reasoning passes
// without prematurely hitting the safety cap and getting clipped to a
// generic error string instead of a synthesized answer.
export const OLLAMA_TOOL_LOOP_MAX_ITERATIONS_DEFAULT = 50;

// Hard upper bound the AppConfig schema accepts. Keeps a runaway env var
// from giving the model an unbounded number of turns.
export const OLLAMA_TOOL_LOOP_MAX_ITERATIONS_HARD_CAP = 200;

// Total wall-clock budget across ALL turns of one loop. Each turn already
// honours OLLAMA_GENERATE_TIMEOUT_MS individually; this caps the
// cumulative elapsed time so a slow agentic chain cannot keep the user
// waiting indefinitely. Runtime source-of-truth:
// AppConfig.get().OLLAMA_TOOL_LOOP_TOTAL_TIMEOUT_MS.
export const OLLAMA_TOOL_LOOP_TOTAL_TIMEOUT_MS_DEFAULT = 600_000;

// Operator ceiling for OLLAMA_TOOL_LOOP_TOTAL_TIMEOUT_MS — 30 minutes.
// Above this the agentic chain almost certainly stuck; better to wrap up.
export const OLLAMA_TOOL_LOOP_TOTAL_TIMEOUT_MS_HARD_CAP = 1_800_000;

// System message appended right before the final non-tool POST when the
// loop hits a cap. Forces the model to synthesize an answer from already-
// gathered evidence instead of asking for more tools — the wrap-up POST
// is sent with NO `tools` field so the model has no choice but text.
export const OLLAMA_TOOL_LOOP_WRAPUP_INSTRUCTION =
  'You have used the maximum allowed research budget. Produce a comprehensive final answer based on the information you have already gathered. Do NOT request more tools.';

// Per-tool-result truncation. The actual /api/web_search payload can be
// tens of KB; we trim it before appending to the chat messages so the
// next turn's context stays sane.
export const OLLAMA_TOOL_RESULT_MAX_CHARS = 8_000;
