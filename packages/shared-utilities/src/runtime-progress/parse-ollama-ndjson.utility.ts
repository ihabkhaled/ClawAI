/**
 * Shape returned by {@link parseOllamaNdjsonLine}. All fields are optional
 * except `done` so callers can spread it into their own progress envelopes
 * without having to redundantly check every property.
 *
 * - `contentDelta` is the visible answer chunk (from `message.content` on the
 *   chat endpoint or `response` on the generate endpoint).
 * - `reasoningDelta` is the visible reasoning chunk (from `message.thinking`
 *   or top-level `thinking`).
 * - `done` is true only on the final terminating line of the NDJSON stream.
 * - `finalTimings` is present only when `done` is true and contains the raw
 *   nanosecond durations + token counts emitted by Ollama.
 * - `rawProviderEventType` is a coarse classification used by the envelope
 *   builder to populate `ClawRuntimeProgressEvent.rawProviderEventType`.
 */
export type ParsedOllamaChunk = {
  contentDelta?: string;
  reasoningDelta?: string;
  done: boolean;
  finalTimings?: {
    totalDurationNs?: number;
    loadDurationNs?: number;
    promptEvalCount?: number;
    promptEvalDurationNs?: number;
    evalCount?: number;
    evalDurationNs?: number;
    doneReason?: string;
  };
  rawProviderEventType: 'ollama_chat_message' | 'ollama_generate_response' | 'ollama_done';
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function readString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === 'string' ? value : undefined;
}

function readNumber(record: Record<string, unknown>, key: string): number | undefined {
  const value = record[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function readBoolean(record: Record<string, unknown>, key: string): boolean {
  return record[key] === true;
}

function buildFinalTimings(root: Record<string, unknown>): ParsedOllamaChunk['finalTimings'] {
  const timings: NonNullable<ParsedOllamaChunk['finalTimings']> = {};
  const totalDurationNs = readNumber(root, 'total_duration');
  const loadDurationNs = readNumber(root, 'load_duration');
  const promptEvalCount = readNumber(root, 'prompt_eval_count');
  const promptEvalDurationNs = readNumber(root, 'prompt_eval_duration');
  const evalCount = readNumber(root, 'eval_count');
  const evalDurationNs = readNumber(root, 'eval_duration');
  const doneReason = readString(root, 'done_reason');

  if (totalDurationNs !== undefined) {
    timings.totalDurationNs = totalDurationNs;
  }
  if (loadDurationNs !== undefined) {
    timings.loadDurationNs = loadDurationNs;
  }
  if (promptEvalCount !== undefined) {
    timings.promptEvalCount = promptEvalCount;
  }
  if (promptEvalDurationNs !== undefined) {
    timings.promptEvalDurationNs = promptEvalDurationNs;
  }
  if (evalCount !== undefined) {
    timings.evalCount = evalCount;
  }
  if (evalDurationNs !== undefined) {
    timings.evalDurationNs = evalDurationNs;
  }
  if (doneReason !== undefined) {
    timings.doneReason = doneReason;
  }

  return timings;
}

/**
 * Parses a single NDJSON line emitted by the Ollama `/api/chat` or
 * `/api/generate` streaming endpoints. Returns a normalized
 * {@link ParsedOllamaChunk} or `null` if the line is empty, whitespace-only,
 * or not valid JSON.
 *
 * The function never throws: malformed or unexpected payloads return `null`
 * so that streaming pipelines can safely skip them and continue processing.
 *
 * Handles the union of three event shapes:
 * 1. Chat streaming: `{ message: { content, thinking? }, done }`
 * 2. Generate streaming: `{ response, thinking?, done }`
 * 3. Terminal frame: `{ done: true, total_duration, eval_count, ... }`
 */
export function parseOllamaNdjsonLine(line: string): ParsedOllamaChunk | null {
  if (typeof line !== 'string') {
    return null;
  }
  const trimmed = line.trim();
  if (trimmed.length === 0) {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return null;
  }

  const root = asRecord(parsed);
  if (root === null) {
    return null;
  }

  const done = readBoolean(root, 'done');

  const messageRecord = asRecord(root['message']);
  const chatContent = messageRecord ? readString(messageRecord, 'content') : undefined;
  const chatThinking = messageRecord ? readString(messageRecord, 'thinking') : undefined;

  const generateResponse = readString(root, 'response');
  const topLevelThinking = readString(root, 'thinking');

  const reasoningDelta = chatThinking ?? topLevelThinking;
  const contentDelta = chatContent ?? generateResponse;

  let rawProviderEventType: ParsedOllamaChunk['rawProviderEventType'];
  if (done) {
    rawProviderEventType = 'ollama_done';
  } else if (messageRecord !== null) {
    rawProviderEventType = 'ollama_chat_message';
  } else if (generateResponse !== undefined || topLevelThinking !== undefined) {
    rawProviderEventType = 'ollama_generate_response';
  } else {
    // Unknown shape but valid JSON object — treat as a soft skip.
    return null;
  }

  const chunk: ParsedOllamaChunk = {
    done,
    rawProviderEventType,
  };

  if (contentDelta !== undefined && contentDelta.length > 0) {
    chunk.contentDelta = contentDelta;
  }
  if (reasoningDelta !== undefined && reasoningDelta.length > 0) {
    chunk.reasoningDelta = reasoningDelta;
  }
  if (done) {
    const timings = buildFinalTimings(root);
    if (timings && Object.keys(timings).length > 0) {
      chunk.finalTimings = timings;
    }
  }

  return chunk;
}
