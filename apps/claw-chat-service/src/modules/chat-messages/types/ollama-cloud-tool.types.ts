// Native Ollama `tool_calls` shape emitted on /api/chat responses.
// Reference: https://docs.ollama.com/capabilities/web-search
//
// We only model the fields the client actually consumes — `id` to
// correlate the matching `tool` message, `function.name` to dispatch to
// web_search vs. web_fetch, and `function.arguments` (parsed) to carry
// the {query} or {url} payload.

export type OllamaCloudToolFunctionCall = {
  name: string;
  arguments: Record<string, unknown>;
};

export type OllamaCloudToolCall = {
  id?: string;
  type?: string;
  function: OllamaCloudToolFunctionCall;
};

// One turn of the agentic loop, persisted on the assistant message
// metadata under `toolTranscript` so the FE can render an expandable
// "Used X web tools" trace.
export type OllamaToolTranscriptTurn = {
  turn: number;
  tool: string;
  args: Record<string, unknown>;
  resultPreview: string;
  durationMs: number;
  ok: boolean;
  error?: string;
};

// Cumulative transcript stored on metadata.toolTranscript.
//
// `gracefullyWrapped` is set in tandem with `capReached`: when the loop
// hits the iteration / total-timeout cap, the chat-service issues ONE
// final tool-less POST asking the model to synthesize an answer from
// the evidence already gathered. If that wrap-up POST succeeds, the
// `content` field returned by `runOllamaCloudToolLoop` is the
// synthesized answer AND `gracefullyWrapped=true`. If the wrap-up POST
// fails (network/model error), the loop falls back to the previous
// behaviour of returning the partial accumulated content with
// `gracefullyWrapped=false` so the FE can render a clear error hint
// instead of a misleading "complete" answer.
export type OllamaToolTranscript = {
  turns: OllamaToolTranscriptTurn[];
  iterations: number;
  capReached: boolean;
  gracefullyWrapped?: boolean;
  totalDurationMs: number;
};

// Ollama Cloud tool descriptor exposed to the model in the `tools` field
// of /api/chat. Same JSON-schema shape OpenAI uses; Ollama Cloud's
// /api/chat endpoint accepts it natively.
export type OllamaCloudToolDefinition = {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};

// Options bag for executeOllamaCloudToolCall — passes the connector
// base URL, decrypted apiKey, and per-call timeout into the runner so
// it can dispatch the tool against /api/web_search or /api/web_fetch.
export type ExecuteOllamaCloudToolCallOptions = {
  baseUrl: string;
  apiKey: string;
  timeoutMs: number;
};
