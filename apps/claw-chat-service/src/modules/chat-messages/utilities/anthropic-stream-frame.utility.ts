// Reads Anthropic's Messages stream (F093) into the provider-agnostic
// fragments the executor already consumes.
//
// The billing-relevant detail: usage arrives in TWO places. `message_start`
// carries `input_tokens` plus BOTH cache counters (`cache_read_input_tokens`,
// `cache_creation_input_tokens`); `message_delta` carries the final
// `output_tokens`. Neither is the whole answer, so they are merged here and ONE
// usage fragment is emitted at the end, run through the shared
// `extractAnthropicUsage` so the prompt total is reassembled the same way the
// buffered path does it (input + cache read + cache write).

import { extractAnthropicUsage } from '@claw/shared-utilities';

import { AiReasoningVisibility } from '../../../common/enums';
import {
  ANTHROPIC_DELTA_INPUT_JSON,
  ANTHROPIC_DELTA_TEXT,
  ANTHROPIC_DELTA_THINKING,
  ANTHROPIC_EVENT_CONTENT_BLOCK_DELTA,
  ANTHROPIC_EVENT_CONTENT_BLOCK_START,
  ANTHROPIC_EVENT_MESSAGE_DELTA,
  ANTHROPIC_EVENT_MESSAGE_START,
  ANTHROPIC_EVENT_MESSAGE_STOP,
  ANTHROPIC_USAGE_FIELDS,
} from '../constants/anthropic-native-transport.constants';
import { ANTHROPIC_TOOL_USE_BLOCK_TYPE } from '../constants/provider-tool.constants';
import type { AnthropicUsageField } from '../types/anthropic-message-shape.types';
import type {
  NormalizedStreamFragment,
  StreamToolCallPayload,
} from '../types/provider-stream.types';
import { mapAnthropicStopReason } from './anthropic-messages-response.utility';

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function isUsageField(field: string): field is AnthropicUsageField {
  return (ANTHROPIC_USAGE_FIELDS as readonly string[]).includes(field);
}

function isCompleteJson(text: string): boolean {
  try {
    JSON.parse(text);
    return true;
  } catch {
    return false;
  }
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

export class AnthropicStreamFrameReader {
  // Latest value seen for each usage counter. A counter that was never reported
  // stays absent, so "no cache field" is not read as a measured zero.
  private readonly usage = new Map<AnthropicUsageField, unknown>();
  private stopReason: string | undefined;
  private finished = false;
  // `tool_use` blocks being assembled, by the block index the frames carry. The
  // input arrives as JSON text split across `input_json_delta` frames.
  private readonly toolBlocks = new Map<number, { id: string; name: string; json: string }>();

  read(frame: Record<string, unknown>, out: NormalizedStreamFragment[]): void {
    switch (frame['type']) {
      case ANTHROPIC_EVENT_MESSAGE_START:
        this.mergeUsage(asRecord(asRecord(frame['message'])?.['usage']));
        return;
      case ANTHROPIC_EVENT_CONTENT_BLOCK_START:
        this.startToolBlock(frame);
        return;
      case ANTHROPIC_EVENT_CONTENT_BLOCK_DELTA:
        this.readBlockDelta(asRecord(frame['delta']), out);
        this.appendToolInput(frame);
        return;
      case ANTHROPIC_EVENT_MESSAGE_DELTA:
        this.stopReason = asString(asRecord(frame['delta'])?.['stop_reason']) ?? this.stopReason;
        this.mergeUsage(asRecord(frame['usage']));
        return;
      case ANTHROPIC_EVENT_MESSAGE_STOP:
        this.finish(out);
        return;
      default:
        return;
    }
  }

  /**
   * A stream that ended without `message_stop` still owes its usage: the hold
   * is settled on whatever was measured. Idempotent with the terminal frame.
   * Tool calls still being assembled are dropped, never run: their input may be
   * cut off mid-JSON.
   */
  flush(out: NormalizedStreamFragment[]): void {
    if (!this.finished && this.usage.size > 0) {
      this.emitUsage(out);
    }
  }

  private readBlockDelta(
    delta: Record<string, unknown> | null,
    out: NormalizedStreamFragment[],
  ): void {
    if (delta === null) {
      return;
    }
    if (delta['type'] === ANTHROPIC_DELTA_TEXT) {
      const text = asString(delta['text']);
      if (text !== undefined && text.length > 0) {
        out.push({ kind: 'content', text });
      }
      return;
    }
    if (delta['type'] === ANTHROPIC_DELTA_THINKING) {
      const thinking = asString(delta['thinking']);
      if (thinking !== undefined && thinking.length > 0) {
        out.push({
          kind: 'reasoning',
          text: thinking,
          visibility: AiReasoningVisibility.PROVIDER_EXPOSED,
        });
      }
    }
  }

  private startToolBlock(frame: Record<string, unknown>): void {
    const block = asRecord(frame['content_block']);
    const index = frame['index'];
    if (block?.['type'] !== ANTHROPIC_TOOL_USE_BLOCK_TYPE || typeof index !== 'number') {
      return;
    }
    this.toolBlocks.set(index, {
      id: asString(block['id']) ?? `toolu_${String(index)}`,
      name: asString(block['name']) ?? '',
      json: '',
    });
  }

  private appendToolInput(frame: Record<string, unknown>): void {
    const delta = asRecord(frame['delta']);
    const index = frame['index'];
    if (delta?.['type'] !== ANTHROPIC_DELTA_INPUT_JSON || typeof index !== 'number') {
      return;
    }
    const block = this.toolBlocks.get(index);
    if (block !== undefined) {
      block.json += asString(delta['partial_json']) ?? '';
    }
  }

  /**
   * Every tool call, released once and before usage, in the order the model
   * emitted them. A call with no input delta takes no arguments: `{}`, which is
   * what Anthropic means by it.
   */
  private releaseToolCalls(out: NormalizedStreamFragment[]): void {
    if (this.toolBlocks.size === 0) {
      return;
    }
    // A reply cut off by max_tokens holds half-written arguments; running them
    // would fail the whole call, so only blocks that parse are released.
    const cutOff = this.stopReason === 'max_tokens';
    const calls = [...this.toolBlocks.entries()]
      .filter(([, block]) => !cutOff || block.json.length === 0 || isCompleteJson(block.json))
      .sort(([a], [b]) => a - b)
      .map(([, block]): StreamToolCallPayload => ({
        id: block.id,
        type: ANTHROPIC_TOOL_USE_BLOCK_TYPE,
        name: block.name,
        input: block.json.length > 0 ? block.json : '{}',
      }));
    this.toolBlocks.clear();
    if (calls.length > 0) {
      out.push({ kind: 'tool-calls', calls });
    }
  }

  private mergeUsage(usage: Record<string, unknown> | null): void {
    if (usage === null) {
      return;
    }
    for (const [field, value] of Object.entries(usage)) {
      if (isUsageField(field)) {
        this.usage.set(field, value);
      }
    }
  }

  private finish(out: NormalizedStreamFragment[]): void {
    if (this.finished) {
      return;
    }
    this.releaseToolCalls(out);
    if (this.usage.size > 0) {
      this.emitUsage(out);
    }
    this.finished = true;
    out.push({ kind: 'done', finishReason: mapAnthropicStopReason(this.stopReason) });
  }

  private emitUsage(out: NormalizedStreamFragment[]): void {
    this.finished = true;
    const usage = extractAnthropicUsage({ usage: Object.fromEntries(this.usage) });
    out.push({
      kind: 'usage',
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      totalTokens: usage.totalTokens,
      cachedPromptTokens: usage.cachedPromptTokens,
      ...(usage.cacheCreationPromptTokens === undefined
        ? {}
        : { cacheCreationPromptTokens: usage.cacheCreationPromptTokens }),
    });
  }
}
