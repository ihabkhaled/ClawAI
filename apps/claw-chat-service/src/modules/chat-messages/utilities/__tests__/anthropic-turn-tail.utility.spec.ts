import { describe, expect, it } from 'vitest';

import type { OpenAiChatMessage } from '../../types/execution.types';
import { appendTailToConversation } from '../anthropic-turn-tail.utility';

const user = (content: OpenAiChatMessage['content']): OpenAiChatMessage => ({
  role: 'user',
  content,
});

describe('appendTailToConversation', () => {
  it('returns the same conversation for an empty tail', () => {
    const conversation = [user('hi')];
    expect(appendTailToConversation(conversation, '')).toBe(conversation);
  });

  it('adds the tail as its own text block on the last user turn', () => {
    const result = appendTailToConversation([user('first'), user('second')], 'TAIL');
    expect(result[0]).toEqual(user('first'));
    expect(result[1]?.content).toEqual([
      { type: 'text', text: 'second' },
      { type: 'text', text: 'TAIL' },
    ]);
  });

  it('keeps the parts of a multimodal last turn and adds the tail after them', () => {
    const image = { type: 'image_url' as const, image_url: { url: 'data:image/png;base64,AA' } };
    const result = appendTailToConversation(
      [user([{ type: 'text', text: 'look' }, image])],
      'TAIL',
    );
    expect(result[0]?.content).toEqual([
      { type: 'text', text: 'look' },
      image,
      { type: 'text', text: 'TAIL' },
    ]);
  });

  it('opens a user turn when the conversation ends on the assistant', () => {
    const result = appendTailToConversation(
      [user('q'), { role: 'assistant', content: 'a' }],
      'TAIL',
    );
    expect(result.at(-1)).toEqual({ role: 'user', content: [{ type: 'text', text: 'TAIL' }] });
    expect(result).toHaveLength(3);
  });

  it('opens a user turn for an empty conversation', () => {
    expect(appendTailToConversation([], 'TAIL')).toEqual([
      { role: 'user', content: [{ type: 'text', text: 'TAIL' }] },
    ]);
  });

  it('does not change the conversation it was given', () => {
    const conversation = [user('only')];
    appendTailToConversation(conversation, 'TAIL');
    expect(conversation).toEqual([user('only')]);
  });
});
