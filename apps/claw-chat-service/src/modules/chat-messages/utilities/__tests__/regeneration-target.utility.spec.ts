import { findPrecedingUserMessage } from '../regeneration-target.utility';
import { type ChatMessage, MessageRole } from '../../../../generated/prisma';

const row = (id: string, role: MessageRole): ChatMessage => ({ id, role }) as ChatMessage;

describe('findPrecedingUserMessage', () => {
  it('returns the nearest user row before the message', () => {
    // newest first: a2, u2, a1, u1
    const recent = [
      row('a2', MessageRole.ASSISTANT),
      row('u2', MessageRole.USER),
      row('a1', MessageRole.ASSISTANT),
      row('u1', MessageRole.USER),
    ];

    expect(findPrecedingUserMessage(recent, 'a2')?.id).toBe('u2');
    expect(findPrecedingUserMessage(recent, 'a1')?.id).toBe('u1');
  });

  it('searches the whole window when the message is not in it', () => {
    const recent = [row('a2', MessageRole.ASSISTANT), row('u2', MessageRole.USER)];

    expect(findPrecedingUserMessage(recent, 'missing')?.id).toBe('u2');
  });

  it('ignores rows after the message', () => {
    const recent = [row('u3', MessageRole.USER), row('a1', MessageRole.ASSISTANT)];

    expect(findPrecedingUserMessage(recent, 'a1')).toBeUndefined();
  });

  it('returns undefined for an empty window', () => {
    expect(findPrecedingUserMessage([], 'a1')).toBeUndefined();
  });
});
