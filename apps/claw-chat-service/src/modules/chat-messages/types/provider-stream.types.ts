import { type AiReasoningVisibility } from '../../../common/enums';

// Provider-agnostic fragments produced by the stream reader after normalizing
// a raw OpenAI-SSE or Ollama-NDJSON frame. Reasoning here is PROVIDER-NATIVE
// (e.g. OpenAI delta.reasoning_content, Ollama `thinking`); model-emitted
// <think> tags inside content are split downstream by ThinkingFragmentScanner.
export type NormalizedStreamFragment =
  | { kind: 'content'; text: string }
  | { kind: 'reasoning'; text: string; visibility: AiReasoningVisibility }
  | {
      kind: 'usage';
      promptTokens?: number;
      completionTokens?: number;
      totalTokens?: number;
    }
  | { kind: 'done'; finishReason?: string };
