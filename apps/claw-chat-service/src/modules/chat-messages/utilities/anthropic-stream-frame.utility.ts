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
  ANTHROPIC_DELTA_TEXT,
  ANTHROPIC_DELTA_THINKING,
  ANTHROPIC_EVENT_CONTENT_BLOCK_DELTA,
  ANTHROPIC_EVENT_MESSAGE_DELTA,
  ANTHROPIC_EVENT_MESSAGE_START,
  ANTHROPIC_EVENT_MESSAGE_STOP,
  ANTHROPIC_USAGE_FIELDS,
} from '../constants/anthropic-native-transport.constants';
import type { AnthropicUsageField } from '../types/anthropic-message-shape.types';
import type { NormalizedStreamFragment } from '../types/provider-stream.types';
import { mapAnthropicStopReason } from './anthropic-messages-response.utility';

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function isUsageField(field: string): field is AnthropicUsageField {
  return (ANTHROPIC_USAGE_FIELDS as readonly string[]).includes(field);
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

  read(frame: Record<string, unknown>, out: NormalizedStreamFragment[]): void {
    switch (frame['type']) {
      case ANTHROPIC_EVENT_MESSAGE_START:
        this.mergeUsage(asRecord(asRecord(frame['message'])?.['usage']));
        return;
      case ANTHROPIC_EVENT_CONTENT_BLOCK_DELTA:
        this.readBlockDelta(asRecord(frame['delta']), out);
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
