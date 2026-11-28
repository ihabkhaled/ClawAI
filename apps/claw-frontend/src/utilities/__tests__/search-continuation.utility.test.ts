import { describe, expect, it } from 'vitest';

import { MessageRole } from '@/enums';
import type { ChatMessage } from '@/types/chat.types';
import { isPendingSearchPromise } from '@/utilities/search-continuation.utility';

const message = (role: MessageRole, metadata: Record<string, unknown> | null): ChatMessage =>
  ({ id: 'm', role, content: 'I will search.', metadata }) as unknown as ChatMessage;

describe('isPendingSearchPromise', () => {
  it('is true only for an assistant promise still waiting for its answer', () => {
    expect(
      isPendingSearchPromise(
        message(MessageRole.ASSISTANT, { searchContinuation: { status: 'pending', query: 'q' } }),
      ),
    ).toBe(true);
  });

  it.each([
    [
      'a finished promise',
      message(MessageRole.ASSISTANT, { searchContinuation: { status: 'done' } }),
    ],
    ['an ordinary answer', message(MessageRole.ASSISTANT, { provider: 'x' })],
    ['an answer with no metadata', message(MessageRole.ASSISTANT, null)],
    ['a user message', message(MessageRole.USER, { searchContinuation: { status: 'pending' } })],
  ])('is false for %s', (_name, value) => {
    expect(isPendingSearchPromise(value)).toBe(false);
  });

  it('is false when there is no message', () => {
    expect(isPendingSearchPromise(undefined)).toBe(false);
  });
});
