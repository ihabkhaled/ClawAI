// A completed round of the Runtime V2 tool loop, in provider-neutral form.
//
// Runtime V2 tools execute client-side, across an SSE hop, so the provider
// transcript cannot live on a call stack — it has to be reconstructed on every
// continuation. `ToolTurn` is that reconstruction unit: what the assistant
// said, what it asked for, and what the trusted executor returned.
//
// Each dialect renders these into its own message shape at request-build time
// rather than being converted from a canonical OpenAI shape, because
// Anthropic's tool result is a `user` turn with content blocks — a structure
// that does not survive a role-preserving transform.

export type ToolTurnCall = {
  callId: string;
  // The sanitized provider-facing function name, as it was sent. Echoing back
  // anything else breaks correlation on providers that validate the name.
  nativeName: string;
  arguments: Record<string, unknown>;
};

export type ToolTurnResult = {
  callId: string;
  content: string;
  isError: boolean;
};

export type ToolTurn = {
  // Any prose the model emitted alongside its tool calls. Providers may return
  // both; dropping it loses the model's stated reasoning for the call.
  assistantText: string;
  calls: readonly ToolTurnCall[];
  results: readonly ToolTurnResult[];
};
