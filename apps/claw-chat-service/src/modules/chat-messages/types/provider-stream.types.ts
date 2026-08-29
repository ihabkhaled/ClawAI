import { type AiReasoningVisibility } from '../../../common/enums';

// Nanosecond-precision timing fields emitted on the final Ollama NDJSON frame.
// Mirrors ParsedOllamaChunk.finalTimings from @claw/shared-utilities so the
// shared utility (`extractOllamaFinalTimings`) can consume this shape directly.
// All fields are optional because not every runtime / version emits them.
export type ProviderStreamFinalTimings = {
  totalDurationNs?: number;
  loadDurationNs?: number;
  promptEvalCount?: number;
  promptEvalDurationNs?: number;
  evalCount?: number;
  evalDurationNs?: number;
  doneReason?: string;
};

// Provider-agnostic fragments produced by the stream reader after normalizing
// a raw OpenAI-SSE or Ollama-NDJSON frame. Reasoning here is PROVIDER-NATIVE
// (e.g. OpenAI delta.reasoning_content, Ollama `thinking`); model-emitted
// <think> tags inside content are split downstream by ThinkingFragmentScanner.
//
// The terminal `done` fragment optionally carries `finalTimings` for runtimes
// that report nanosecond-precision durations (Ollama). The executor uses it
// to emit a rich METRICS event with bottleneck breakdown.
// One fully-assembled native tool call recovered from a stream.
//
// `arguments` is deliberately `string | Record` rather than normalized here:
// OpenAI-compatible providers stream it as a JSON string split across chunks,
// native Ollama emits it as a complete object. The reader emits whichever
// shape its own protocol produced, and `normalizeToolCalls` — called with the
// matching dialect — already accepts both. Converting inside the reader would
// mean parsing JSON twice and losing the provider's exact bytes.
export type StreamToolCallPayload = {
  id?: string;
  type?: string;
  function: {
    name: string;
    arguments: string | Record<string, unknown>;
  };
};

// Accumulator slot inside ProviderStreamReader while a tool call is still
// being assembled from deltas. `argumentsText` is the concatenated OpenAI JSON
// fragment; `argumentsObject` is set instead when the protocol delivered the
// arguments complete (native Ollama). Exactly one of the two is meaningful.
export type MutableToolCall = {
  id?: string;
  type?: string;
  name: string;
  argumentsText: string;
  argumentsObject?: Record<string, unknown>;
};

export type NormalizedStreamFragment =
  | { kind: 'content'; text: string }
  | { kind: 'reasoning'; text: string; visibility: AiReasoningVisibility }
  | {
      kind: 'usage';
      promptTokens?: number;
      completionTokens?: number;
      totalTokens?: number;
      /**
       * The discounted subset of `promptTokens` the provider served from cache,
       * and the subset of `completionTokens` the model spent thinking.
       *
       * The reader used to drop both. A streamed reasoning model therefore
       * finalized its PAYG hold with `reasoningTokens: 0` - billing zero on the
       * single most expensive component of the call (ADR-078). Absent means the
       * provider reported nothing, which is not the same as a measured zero.
       */
      cachedPromptTokens?: number;
      reasoningTokens?: number;
    }
  // Emitted ONCE per stream, immediately before the terminal `done` fragment,
  // carrying every tool call the model requested — fully merged. OpenAI-SSE
  // fragments a single call across many frames (name in one, `arguments` JSON
  // split arbitrarily, correlated only by `index`), so a per-delta fragment
  // would hand consumers unusable partial JSON.
  | { kind: 'tool-calls'; calls: readonly StreamToolCallPayload[] }
  | { kind: 'done'; finishReason?: string; finalTimings?: ProviderStreamFinalTimings };
