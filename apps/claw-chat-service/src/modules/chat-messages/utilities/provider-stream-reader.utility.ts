import { AiReasoningVisibility, AiStreamProtocol } from '../../../common/enums';
import {
  type NormalizedStreamFragment,
  type ProviderStreamFinalTimings,
} from '../types/provider-stream.types';

// Stateful, chunk-boundary-safe reader that normalizes a provider's raw stream
// text into NormalizedStreamFragment[]. Supports the two wire formats ClawAI
// actually uses: OpenAI-compatible SSE (all cloud providers + llama.cpp) and
// Ollama native NDJSON (local + OLLAMA connector). Buffers partial lines so a
// JSON frame split across network chunks is parsed correctly.
export class ProviderStreamReader {
  private buffer = '';

  constructor(private readonly protocol: AiStreamProtocol) {}

  push(textChunk: string): NormalizedStreamFragment[] {
    this.buffer += textChunk;
    const fragments: NormalizedStreamFragment[] = [];
    let newlineIndex = this.buffer.indexOf('\n');
    while (newlineIndex !== -1) {
      const line = this.buffer.slice(0, newlineIndex);
      this.buffer = this.buffer.slice(newlineIndex + 1);
      this.parseLine(line, fragments);
      newlineIndex = this.buffer.indexOf('\n');
    }
    return fragments;
  }

  flush(): NormalizedStreamFragment[] {
    const fragments: NormalizedStreamFragment[] = [];
    const remainder = this.buffer.trim();
    this.buffer = '';
    if (remainder.length > 0) {
      this.parseLine(remainder, fragments);
    }
    return fragments;
  }

  private parseLine(rawLine: string, out: NormalizedStreamFragment[]): void {
    const line = rawLine.trim();
    if (line.length === 0) {
      return;
    }
    if (this.protocol === AiStreamProtocol.OPENAI_SSE) {
      this.parseOpenAiLine(line, out);
    } else {
      this.parseOllamaLine(line, out);
    }
  }

  private parseOpenAiLine(line: string, out: NormalizedStreamFragment[]): void {
    if (line.startsWith(':')) {
      return; // SSE comment / heartbeat
    }
    if (!line.startsWith('data:')) {
      return;
    }
    const payload = line.slice('data:'.length).trim();
    if (payload === '[DONE]') {
      out.push({ kind: 'done' });
      return;
    }
    const frame = safeParseJson(payload);
    if (frame === null) {
      return;
    }
    this.emitOpenAiFrame(frame, out);
  }

  private emitOpenAiFrame(frame: Record<string, unknown>, out: NormalizedStreamFragment[]): void {
    const choices = getArray(frame, 'choices');
    const firstChoice = choices !== null ? asRecord(choices[0]) : null;
    const delta = firstChoice !== null ? getRecord(firstChoice, 'delta') : null;
    if (delta !== null) {
      const reasoning = getString(delta, 'reasoning_content') ?? getString(delta, 'reasoning');
      if (reasoning !== undefined && reasoning.length > 0) {
        out.push({
          kind: 'reasoning',
          text: reasoning,
          visibility: AiReasoningVisibility.PROVIDER_EXPOSED,
        });
      }
      const content = getString(delta, 'content');
      if (content !== undefined && content.length > 0) {
        out.push({ kind: 'content', text: content });
      }
    }
    const usage = getRecord(frame, 'usage');
    if (usage !== null) {
      out.push({
        kind: 'usage',
        promptTokens: getNumber(usage, 'prompt_tokens'),
        completionTokens: getNumber(usage, 'completion_tokens'),
        totalTokens: getNumber(usage, 'total_tokens'),
      });
    }
    const finishReason = firstChoice !== null ? getString(firstChoice, 'finish_reason') : undefined;
    if (finishReason !== undefined && finishReason.length > 0) {
      out.push({ kind: 'done', finishReason });
    }
  }

  private parseOllamaLine(line: string, out: NormalizedStreamFragment[]): void {
    const frame = safeParseJson(line);
    if (frame === null) {
      return;
    }
    const thinking = getString(frame, 'thinking');
    if (thinking !== undefined && thinking.length > 0) {
      out.push({
        kind: 'reasoning',
        text: thinking,
        visibility: AiReasoningVisibility.MODEL_EMITTED,
      });
    }
    const message = getRecord(frame, 'message');
    const content = getString(frame, 'response') ?? (message !== null ? getString(message, 'content') : undefined);
    if (content !== undefined && content.length > 0) {
      out.push({ kind: 'content', text: content });
    }
    if (getBoolean(frame, 'done') === true) {
      out.push({
        kind: 'usage',
        promptTokens: getNumber(frame, 'prompt_eval_count'),
        completionTokens: getNumber(frame, 'eval_count'),
      });
      const finalTimings = extractOllamaFinalTimings(frame);
      out.push({
        kind: 'done',
        finishReason: getString(frame, 'done_reason') ?? 'stop',
        ...(finalTimings !== undefined ? { finalTimings } : {}),
      });
    }
  }
}

// Reads the nanosecond-precision Ollama final-frame timing fields into a
// ProviderStreamFinalTimings. Returns undefined when none of the timing
// fields are present so callers can decide whether to emit a rich metrics
// event without an extra null check on every key.
function extractOllamaFinalTimings(
  frame: Record<string, unknown>,
): ProviderStreamFinalTimings | undefined {
  const totalDurationNs = getNumber(frame, 'total_duration');
  const loadDurationNs = getNumber(frame, 'load_duration');
  const promptEvalCount = getNumber(frame, 'prompt_eval_count');
  const promptEvalDurationNs = getNumber(frame, 'prompt_eval_duration');
  const evalCount = getNumber(frame, 'eval_count');
  const evalDurationNs = getNumber(frame, 'eval_duration');
  const doneReason = getString(frame, 'done_reason');

  const timings: ProviderStreamFinalTimings = {};
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

  return Object.keys(timings).length > 0 ? timings : undefined;
}

function safeParseJson(text: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(text);
    return asRecord(parsed);
  } catch {
    return null;
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function getRecord(rec: Record<string, unknown>, key: string): Record<string, unknown> | null {
  return asRecord(rec[key]);
}

function getArray(rec: Record<string, unknown>, key: string): unknown[] | null {
  const value = rec[key];
  return Array.isArray(value) ? value : null;
}

function getString(rec: Record<string, unknown>, key: string): string | undefined {
  const value = rec[key];
  return typeof value === 'string' ? value : undefined;
}

function getNumber(rec: Record<string, unknown>, key: string): number | undefined {
  const value = rec[key];
  return typeof value === 'number' ? value : undefined;
}

function getBoolean(rec: Record<string, unknown>, key: string): boolean | undefined {
  const value = rec[key];
  return typeof value === 'boolean' ? value : undefined;
}
