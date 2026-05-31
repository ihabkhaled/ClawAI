import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { VirtualizedMessageItem } from '@/components/chat/virtualized-message-item';
import type { ChatMessage, MessageRenderItem } from '@/types';
import type { TranslateFunction } from '@/types/i18n.types';

vi.mock('@/components/chat/message-bubble', () => ({
  MessageBubble: () => <div data-testid="message-bubble" />,
}));
vi.mock('@/components/chat/parallel-message-group', () => ({
  ParallelMessageGroup: () => <div data-testid="parallel-group" />,
}));

const t: TranslateFunction = (key: string): string => key;

function makeMessage(id: string): ChatMessage {
  return {
    id,
    threadId: 'thread-1',
    role: 'ASSISTANT' as never,
    content: 'hello',
    createdAt: new Date().toISOString(),
  } as unknown as ChatMessage;
}

describe('VirtualizedMessageItem', () => {
  it('renders the single MessageBubble branch for single items', () => {
    const item: MessageRenderItem = { kind: 'single', message: makeMessage('m1') };
    render(<VirtualizedMessageItem item={item} t={t} />);
    expect(screen.getByTestId('message-bubble')).toBeInTheDocument();
    expect(screen.queryByTestId('parallel-group')).toBeNull();
  });

  it('renders the ParallelMessageGroup branch for parallel items', () => {
    const item: MessageRenderItem = {
      kind: 'parallel',
      messages: [makeMessage('a'), makeMessage('b')],
    };
    render(<VirtualizedMessageItem item={item} t={t} />);
    expect(screen.getByTestId('parallel-group')).toBeInTheDocument();
    expect(screen.queryByTestId('message-bubble')).toBeNull();
  });
});
