import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ContextSaveProposalHost } from '@/components/chat/context-save-proposal-host';
import { MessageRole } from '@/enums';
import { useContextSaveProposalStore } from '@/stores/context-save-proposal.store';
import type { ChatMessage, ContextSaveProposal } from '@/types';

vi.mock('@/repositories/chat/chat.repository', () => ({
  chatRepository: { confirmContextSave: vi.fn(), dismissContextSave: vi.fn() },
}));
vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const PROPOSAL: ContextSaveProposal = {
  memory: { type: 'FACT', text: 'The user is vegetarian.' },
  pack: null,
  options: [],
};

const proposedAnswer = (id: string): ChatMessage =>
  ({
    id,
    threadId: 't-1',
    role: MessageRole.ASSISTANT,
    content: 'Noted',
    metadata: { contextSave: { status: 'PROPOSED', proposal: PROPOSAL } },
  }) as unknown as ChatMessage;

const userMessage = (id: string): ChatMessage =>
  ({ id, threadId: 't-1', role: MessageRole.USER, content: 'hi', metadata: null }) as ChatMessage;

const wrap = (children: ReactNode) => (
  <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
);

describe('ContextSaveProposalHost (ADR-168)', () => {
  beforeEach(() => {
    useContextSaveProposalStore.getState().close();
  });

  it('shows nothing for a reloaded thread, whatever its last answer carries', () => {
    render(
      wrap(
        <ContextSaveProposalHost
          threadId="t-1"
          messages={[userMessage('u-1'), proposedAnswer('a-1')]}
          isReady
          isFetching={false}
        />,
      ),
    );

    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('opens the dialog by itself for a fresh proposed answer', () => {
    const history = [userMessage('u-1')];
    const { rerender } = render(
      wrap(
        <ContextSaveProposalHost threadId="t-1" messages={history} isReady isFetching={false} />,
      ),
    );
    expect(screen.queryByRole('dialog')).toBeNull();

    rerender(
      wrap(
        <ContextSaveProposalHost
          threadId="t-1"
          messages={[...history, userMessage('u-2'), proposedAnswer('a-2')]}
          isReady
          isFetching={false}
        />,
      ),
    );

    expect(
      screen.getByRole('dialog', { name: 'chat.contextSave.proposal.dialogTitle' }),
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue('The user is vegetarian.')).toBeInTheDocument();
  });

  it('opens from the card for an old answer', () => {
    render(
      wrap(
        <ContextSaveProposalHost
          threadId="t-1"
          messages={[userMessage('u-1'), proposedAnswer('a-1')]}
          isReady
          isFetching={false}
        />,
      ),
    );

    useContextSaveProposalStore.getState().open('a-1');
    render(
      wrap(
        <ContextSaveProposalHost
          threadId="t-1"
          messages={[userMessage('u-1'), proposedAnswer('a-1')]}
          isReady
          isFetching={false}
        />,
      ),
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
