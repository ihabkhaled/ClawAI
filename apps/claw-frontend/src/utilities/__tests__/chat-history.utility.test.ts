import { describe, expect, it } from 'vitest';

import { MessageRole } from '@/enums';
import type { ChatMessage } from '@/types';
import { findLastUserMessageContent } from '@/utilities';

function message(role: MessageRole, content: string, id: string): ChatMessage {
  return {
    id,
    threadId: 't1',
    role,
    content,
    provider: null,
    model: null,
    routingMode: null,
    routerModel: null,
    usedFallback: false,
    inputTokens: null,
    outputTokens: null,
    feedback: null,
    latencyMs: null,
    metadata: null,
    createdAt: '2026-09-12T00:00:00.000Z',
  };
}

describe('findLastUserMessageContent', () => {
  it('returns the most recent USER message, not the most recent message', () => {
    const messages = [
      message(MessageRole.USER, 'first ask', 'm1'),
      message(MessageRole.USER, 'second ask', 'm2'),
      message(MessageRole.ASSISTANT, 'an answer', 'm3'),
    ];
    expect(findLastUserMessageContent(messages)).toBe('second ask');
  });

  it('ignores system and tool turns', () => {
    const messages = [
      message(MessageRole.USER, 'my ask', 'm1'),
      message(MessageRole.TOOL, 'tool output', 'm2'),
      message(MessageRole.SYSTEM, 'system note', 'm3'),
    ];
    expect(findLastUserMessageContent(messages)).toBe('my ask');
  });

  it('returns undefined for a thread with no user turn yet', () => {
    expect(findLastUserMessageContent([])).toBeUndefined();
    expect(
      findLastUserMessageContent([message(MessageRole.ASSISTANT, 'hi', 'm1')]),
    ).toBeUndefined();
  });

  it('treats a whitespace-only message as nothing to recall', () => {
    expect(findLastUserMessageContent([message(MessageRole.USER, '   ', 'm1')])).toBeUndefined();
  });
});
