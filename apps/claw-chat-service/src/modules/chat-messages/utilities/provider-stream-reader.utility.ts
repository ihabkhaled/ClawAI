import { AiReasoningVisibility, AiStreamProtocol } from '../../../common/enums';
import {
  type MutableToolCall,
  type NormalizedStreamFragment,
  type ProviderStreamFinalTimings,
  type StreamToolCallPayload,
} from '../types/provider-stream.types';

// Stateful, chunk-boundary-safe reader that normalizes a provider's raw stream
// text into NormalizedStreamFragment[]. Supports the two wire formats ClawAI
// actually uses: OpenAI-compatible SSE (all cloud providers + llama.cpp) and
// Ollama native NDJSON (local + OLLAMA connector). Buffers partial lines so a
// JSON frame split across network chunks is parsed correctly.
export class ProviderStreamReader {
  private buffer = '';
  // OpenAI-SSE streams a single tool call across many frames: the id and
  // function name arrive once, then `arguments` is emitted as an arbitrarily
  // split JSON string, correlated only by `index`. Nothing downstream can use
  // a partial call, so they are merged here and released whole at the terminal
  // frame. Keyed by the provider's `index` — never by array position, which
  // is not stable across frames.
  private readonly pendingToolCalls = new Map<number, MutableToolCall>();
  private releasedToolCalls = false;

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
    // Safety net: a provider that ends the stream without `[DONE]` or a
    // finish_reason would otherwise strand fully-assembled tool calls in the
    // accumulator, and the run would look like an empty answer.
    this.releaseToolCalls(fragments);
    return fragments;
  }

  // Drains the accumulator into a single `tool-calls` fragment. Idempotent:
  // the terminal frame and flush() can both reach here, and emitting twice
  // would double-dispatch every tool.
  private releaseToolCalls(out: NormalizedStreamFragment[]): void {
    if (this.releasedToolCalls || this.pendingToolCalls.size === 0) {
      return;
    }
    this.releasedToolCalls = true;
    // Sorted by the provider's index so call order is deterministic and
    // matches the order the model emitted them.
    const calls = [...this.pendingToolCalls.entries()]
      .sort(([a], [b]) => a - b)
      .map(([, call]) => toStreamToolCall(call));
    this.pendingToolCalls.clear();
    out.push({ kind: 'tool-calls', calls });
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
      this.releaseToolCalls(out);
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
      this.accumulateOpenAiToolCallDeltas(delta);
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
      // Before `done`, so a consumer that stops reading at the terminal
      // fragment still sees the calls.
      this.releaseToolCalls(out);
      out.push({ kind: 'done', finishReason });
    }
  }

  // Merges one frame's `delta.tool_calls[]` into the accumulator. Every field
  // is optional on any given frame — a provider may send `{index, id, name}`
  // with an empty `arguments`, then a dozen frames carrying only argument
  // fragments — so each is merged only when present rather than overwritten.
  private accumulateOpenAiToolCallDeltas(delta: Record<string, unknown>): void {
    const deltas = getArray(delta, 'tool_calls');
    if (deltas === null) {
      return;
    }
    for (const [position, raw] of deltas.entries()) {
      const entry = asRecord(raw);
      if (entry === null) {
        continue;
      }
      // `index` is the provider's correlation key. Falling back to array
      // position is only correct for the single-call case, but it is strictly
      // better than dropping a call from a provider that omits the field.
      const index = getNumber(entry, 'index') ?? position;
      const existing = this.pendingToolCalls.get(index) ?? { name: '', argumentsText: '' };
      const id = getString(entry, 'id');
      if (id !== undefined && id.length > 0) {
        existing.id = id;
      }
      const type = getString(entry, 'type');
      if (type !== undefined && type.length > 0) {
        existing.type = type;
      }
      const fn = getRecord(entry, 'function');
      if (fn !== null) {
        const name = getString(fn, 'name');
        if (name !== undefined && name.length > 0) {
          existing.name = name;
        }
        const argumentsFragment = getString(fn, 'arguments');
        if (argumentsFragment !== undefined) {
          // Concatenated, never replaced: this is the fragmented JSON string.
          existing.argumentsText += argumentsFragment;
        }
      }
      this.pendingToolCalls.set(index, existing);
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
    const content =
      getString(frame, 'response') ??
      (message !== null ? getString(message, 'content') : undefined);
    if (content !== undefined && content.length > 0) {
      out.push({ kind: 'content', text: content });
    }
    // Native Ollama does NOT fragment tool calls — `message.tool_calls` arrives
    // complete in a single frame, with `arguments` already an object. It still
    // goes through the accumulator so release/ordering/idempotency behave
    // identically on both protocols.
    if (message !== null) {
      this.accumulateOllamaToolCalls(message);
    }
    if (getBoolean(frame, 'done') === true) {
      out.push({
        kind: 'usage',
        promptTokens: getNumber(frame, 'prompt_eval_count'),
        completionTokens: getNumber(frame, 'eval_count'),
      });
      this.releaseToolCalls(out);
      const finalTimings = extractOllamaFinalTimings(frame);
      out.push({
        kind: 'done',
        finishReason: getString(frame, 'done_reason') ?? 'stop',
        ...(finalTimings !== undefined ? { finalTimings } : {}),
      });
    }
  }

  private accumulateOllamaToolCalls(message: Record<string, unknown>): void {
    const calls = getArray(message, 'tool_calls');
    if (calls === null) {
      return;
    }
    for (const [position, raw] of calls.entries()) {
      const entry = asRecord(raw);
      const fn = entry !== null ? getRecord(entry, 'function') : null;
      const name = fn !== null ? getString(fn, 'name') : undefined;
      if (entry === null || fn === null || name === undefined) {
        continue;
      }
      // Offset so a malformed mixed stream cannot collide with an OpenAI index.
      const index = this.pendingToolCalls.size + position;
      const argumentsObject = getRecord(fn, 'arguments');
      this.pendingToolCalls.set(index, {
        ...(getString(entry, 'id') === undefined ? {} : { id: getString(entry, 'id') }),
        ...(getString(entry, 'type') === undefined ? {} : { type: getString(entry, 'type') }),
        name,
        argumentsText: '',
        argumentsObject: argumentsObject ?? {},
      });
    }
  }
}

// Emits the shape the reader's own protocol produced: a JSON string for
// OpenAI-compatible providers, an object for native Ollama. `normalizeToolCalls`
// is called with the matching dialect and already accepts both.
function toStreamToolCall(call: MutableToolCall): StreamToolCallPayload {
  return {
    ...(call.id === undefined ? {} : { id: call.id }),
    ...(call.type === undefined ? {} : { type: call.type }),
    function: {
      name: call.name,
      arguments: call.argumentsObject ?? call.argumentsText,
    },
  };
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
