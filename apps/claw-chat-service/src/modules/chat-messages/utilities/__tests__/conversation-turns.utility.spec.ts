import type { ChatMessage } from '../../../../generated/prisma';
import { flattenTurns, groupIntoTurns } from '../conversation-turns.utility';

function message(id: string, role: ChatMessage['role'], content = 'x'): ChatMessage {
  return { id, role, content, threadId: 't', createdAt: new Date() } as unknown as ChatMessage;
}

describe('groupIntoTurns', () => {
  it('opens a turn at each user message and absorbs the answers', () => {
    const turns = groupIntoTurns([
      message('u1', 'USER'),
      message('a1', 'ASSISTANT'),
      message('u2', 'USER'),
      message('a2', 'ASSISTANT'),
      message('a3', 'ASSISTANT'),
    ]);

    expect(turns).toHaveLength(2);
    expect(turns[0]?.messages.map((m) => m.id)).toEqual(['u1', 'a1']);
    expect(turns[1]?.messages.map((m) => m.id)).toEqual(['u2', 'a2', 'a3']);
  });

  it('keeps tool messages inside the turn that produced them', () => {
    const turns = groupIntoTurns([
      message('u1', 'USER'),
      message('t1', 'TOOL'),
      message('t2', 'TOOL'),
      message('a1', 'ASSISTANT'),
    ]);

    expect(turns).toHaveLength(1);
    expect(turns[0]?.messages.map((m) => m.id)).toEqual(['u1', 't1', 't2', 'a1']);
  });

  it('does not drop messages that precede the first user message', () => {
    const turns = groupIntoTurns([
      message('s1', 'SYSTEM'),
      message('a0', 'ASSISTANT'),
      message('u1', 'USER'),
    ]);

    expect(flattenTurns(turns).map((m) => m.id)).toEqual(['s1', 'a0', 'u1']);
    expect(turns[0]?.userMessage).toBeNull();
  });

  it('returns no turns for an empty thread', () => {
    expect(groupIntoTurns([])).toEqual([]);
  });

  it('estimates a turn as the sum of its messages plus their role envelopes', () => {
    const turns = groupIntoTurns([
      message('u1', 'USER', 'a'.repeat(400)),
      message('a1', 'ASSISTANT', 'b'.repeat(400)),
    ]);

    // 100 tokens of body each, plus 4 envelope tokens each.
    expect(turns[0]?.estimatedTokens).toBe(208);
  });
});

describe('flattenTurns', () => {
  it('restores chronological order and deduplicates by id', () => {
    const turns = groupIntoTurns([
      message('u1', 'USER'),
      message('a1', 'ASSISTANT'),
      message('u2', 'USER'),
    ]);

    expect(flattenTurns([turns[1]!, turns[0]!]).map((m) => m.id)).toEqual(['u1', 'a1', 'u2']);
  });
});
