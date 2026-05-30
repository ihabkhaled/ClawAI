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
export type NormalizedStreamFragment =
  | { kind: 'content'; text: string }
  | { kind: 'reasoning'; text: string; visibility: AiReasoningVisibility }
  | {
      kind: 'usage';
      promptTokens?: number;
      completionTokens?: number;
      totalTokens?: number;
    }
  | { kind: 'done'; finishReason?: string; finalTimings?: ProviderStreamFinalTimings };
