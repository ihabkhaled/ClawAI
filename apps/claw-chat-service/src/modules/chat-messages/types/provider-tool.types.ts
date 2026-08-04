// Wire shapes for provider-native tool calling, plus the normalized form the
// Runtime V2 loop consumes.
//
// The three dialects are deliberately kept as separate literal-typed shapes
// rather than one loose record: the differences between them are exactly the
// places a silent bug lives (see provider-tool-translation.utility.ts).

import type { ToolChoiceMode } from '../../../common/enums';

// ── Request side ────────────────────────────────────────────────────────────

// OpenAI-compatible and native-Ollama both use this function envelope. The
// JSON Schema hangs off `function.parameters`.
export type ProviderToolFunctionSpec = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
};

export type OpenAiToolSpec = {
  type: 'function';
  function: ProviderToolFunctionSpec;
};

// Anthropic flattens the envelope and renames the schema key.
export type AnthropicToolSpec = {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
};

export type ProviderToolSpec = OpenAiToolSpec | AnthropicToolSpec;

// OpenAI accepts a bare string; Anthropic accepts an object.
export type AnthropicToolChoice = {
  type: string;
};

export type OpenAiToolChoice = string;

// ── Response side, raw ──────────────────────────────────────────────────────

// OpenAI-compatible: `arguments` is a JSON **string** that must be parsed.
export type OpenAiToolCallPayload = {
  id?: string;
  type?: string;
  function: {
    name: string;
    arguments: string;
  };
};

// Anthropic: a content block inside `content[]`; `input` is already an object.
export type AnthropicToolUseBlock = {
  type: string;
  id?: string;
  name?: string;
  input?: unknown;
};

// Native Ollama: `arguments` is already an object and `id` is frequently absent.
export type OllamaToolCallPayload = {
  id?: string;
  type?: string;
  function: {
    name: string;
    arguments: unknown;
  };
};

// ── Normalized form ─────────────────────────────────────────────────────────

// One entry of the per-run reverse map. Sanitizing a Runtime tool name for a
// provider's name charset is NOT injective (`workspace.files` and
// `workspace_files` both sanitize to `workspace_files`), so the reverse trip
// must go through this table and never through string replacement.
export type ToolNameLookupEntry = {
  nativeName: string;
  toolName: string;
  toolVersion: string;
  operations: readonly string[];
  targetIds: readonly string[];
};

export type ToolNameLookup = ReadonlyMap<string, ToolNameLookupEntry>;

export type TranslatedToolCatalog = {
  specs: readonly ProviderToolSpec[];
  lookup: ToolNameLookup;
  // Serialized byte size of `specs`, so callers can enforce a catalog budget
  // and measure the per-turn payload cost.
  byteSize: number;
};

// Everything `toolInvocationSchema` needs, recovered exactly from a provider
// tool call. `callId` is retained separately so the tool-result message can be
// correlated back on the next turn.
export type NormalizedToolCall = {
  callId: string;
  nativeName: string;
  toolName: string;
  toolVersion: string;
  operation: string;
  targetId: string;
  arguments: Record<string, unknown>;
};

export type ResolvedToolChoice = {
  openAi?: OpenAiToolChoice;
  anthropic?: AnthropicToolChoice;
  // True when the requested mode could not be expressed on this dialect and
  // was silently weakened. Callers surface this so a degraded anti-drift
  // correction is never mistaken for a strict one.
  degraded: boolean;
  requested: ToolChoiceMode;
};
