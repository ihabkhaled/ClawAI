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
export const OLLAMA_TOOL_LOOP_MAX_ITERATIONS = 10;

// Total wall-clock budget across ALL turns of one loop. Each turn already
// honours OLLAMA_GENERATE_TIMEOUT_MS individually; this caps the
// cumulative elapsed time so a slow agentic chain cannot keep the user
// waiting indefinitely.
export const OLLAMA_TOOL_LOOP_TOTAL_TIMEOUT_MS = 600_000;

// Per-tool-result truncation. The actual /api/web_search payload can be
// tens of KB; we trim it before appending to the chat messages so the
// next turn's context stays sane.
export const OLLAMA_TOOL_RESULT_MAX_CHARS = 8_000;
