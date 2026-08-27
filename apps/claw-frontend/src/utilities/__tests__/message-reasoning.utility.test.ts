import { describe, expect, it } from 'vitest';

import type { ChatMessage } from '@/types';
import { getStoredReasoning } from '@/utilities/message-reasoning.utility';

function message(metadata: Record<string, unknown> | null): ChatMessage {
  return { id: 'm1', content: 'answer', metadata } as unknown as ChatMessage;
}

describe('getStoredReasoning', () => {
  it('returns the stored chain of thought', () => {
    // The whole point: this used to live only in the live stream, so a refresh
    // lost it and reopening the thread the next day showed no trace of it.
    expect(getStoredReasoning(message({ reasoning: 'First I checked the schema.' }))).toBe(
      'First I checked the schema.',
    );
  });

  it('returns null when the model emitted none', () => {
    expect(getStoredReasoning(message({}))).toBeNull();
    expect(getStoredReasoning(message(null))).toBeNull();
  });

  it('treats whitespace-only reasoning as none, so the panel does not render empty', () => {
    expect(getStoredReasoning(message({ reasoning: '   \n  ' }))).toBeNull();
  });

  it('ignores a non-string value rather than rendering it', () => {
    // Metadata is JSONB written by several code paths; a number here would
    // otherwise reach the DOM as "[object Object]" or similar.
    expect(getStoredReasoning(message({ reasoning: 42 }))).toBeNull();
    expect(getStoredReasoning(message({ reasoning: { text: 'x' } }))).toBeNull();
  });

  it('trims, so stored padding does not become leading blank lines', () => {
    expect(getStoredReasoning(message({ reasoning: '\n\nThinking.\n\n' }))).toBe('Thinking.');
  });
});
