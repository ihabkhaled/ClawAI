import { describe, expect, it } from 'vitest';

import { MessageRole } from '@/enums';
import type { ChatMessage } from '@/types';
import { collectUserMessageHistory } from '@/utilities/chat-history.utility';

function message(role: MessageRole, content: string): ChatMessage {
  return { id: `${role}-${content}`, role, content } as ChatMessage;
}

describe('collectUserMessageHistory', () => {
  it("returns the user's own messages, most recent first", () => {
    // Reversed from the thread on purpose: index 0 is one press of ArrowUp.
    const history = collectUserMessageHistory([
      message(MessageRole.USER, 'first'),
      message(MessageRole.ASSISTANT, 'an answer'),
      message(MessageRole.USER, 'second'),
      message(MessageRole.ASSISTANT, 'another answer'),
      message(MessageRole.USER, 'third'),
    ]);
    expect(history).toEqual(['third', 'second', 'first']);
  });

  it('ignores everything the user did not say', () => {
    const history = collectUserMessageHistory([
      message(MessageRole.SYSTEM, 'you are helpful'),
      message(MessageRole.ASSISTANT, 'hello'),
    ]);
    expect(history).toEqual([]);
  });

  it('collapses a repeated prompt', () => {
    // Sending the same prompt twice to compare answers is ordinary; getting
    // past it should cost one press, not two.
    const history = collectUserMessageHistory([
      message(MessageRole.USER, 'same'),
      message(MessageRole.ASSISTANT, 'a'),
      message(MessageRole.USER, 'same'),
      message(MessageRole.ASSISTANT, 'b'),
      message(MessageRole.USER, 'different'),
    ]);
    expect(history).toEqual(['different', 'same']);
  });

  it('skips blank messages', () => {
    const history = collectUserMessageHistory([
      message(MessageRole.USER, '   '),
      message(MessageRole.USER, 'real'),
    ]);
    expect(history).toEqual(['real']);
  });

  it('handles an empty thread', () => {
    expect(collectUserMessageHistory([])).toEqual([]);
  });
});
