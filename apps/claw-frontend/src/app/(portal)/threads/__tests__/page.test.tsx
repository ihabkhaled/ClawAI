import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ThreadPublicationsPage from '../page';

let publicationsState: {
  data: Array<{
    id: string;
    title: string | null;
    updatedAt: string;
    pendingChangeRequests?: number;
  }>;
  isLoading: boolean;
  isError: boolean;
};

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('@/hooks/threads/use-thread-publications', () => ({
  useThreadPublications: () => publicationsState,
}));
vi.mock('@/components/threads/thread-create-dialog', () => ({
  ThreadCreateDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="create-dialog" /> : null,
}));

describe('Threads list page', () => {
  beforeEach(() => {
    publicationsState = { data: [], isLoading: false, isError: false };
  });

  it('is a list only: no creation form on the page', () => {
    render(<ThreadPublicationsPage />);

    expect(screen.queryByText('chat.threadStartGeneration')).not.toBeInTheDocument();
    expect(screen.getByText('chat.noThreads')).toBeInTheDocument();
  });

  it('links each publication to its own page', () => {
    publicationsState.data = [
      { id: 'pub1234567890', title: 'Local-first AI', updatedAt: '2026-10-07T10:00:00.000Z' },
    ];
    render(<ThreadPublicationsPage />);

    expect(screen.getByRole('link', { name: /Local-first AI/u })).toHaveAttribute(
      'href',
      '/threads/review/pub1234567890',
    );
  });

  it('shows how many reader suggestions wait on a Thread, and nothing when none do', () => {
    publicationsState.data = [
      {
        id: 'pub-a',
        title: 'Has requests',
        updatedAt: '2026-10-07T10:00:00.000Z',
        pendingChangeRequests: 2,
      },
      {
        id: 'pub-b',
        title: 'Has none',
        updatedAt: '2026-10-07T10:00:00.000Z',
        pendingChangeRequests: 0,
      },
    ];
    render(<ThreadPublicationsPage />);

    const badges = screen.getAllByTestId('thread-pending-badge');
    expect(badges).toHaveLength(1);
    expect(badges[0]).toHaveTextContent('chat.threadCrBadge');
  });

  it('links to My suggestions', () => {
    render(<ThreadPublicationsPage />);

    expect(screen.getByRole('link', { name: 'chat.threadCrMineLink' })).toHaveAttribute(
      'href',
      '/threads/my/suggestions',
    );
  });

  it('opens the create modal from the button', async () => {
    render(<ThreadPublicationsPage />);
    expect(screen.queryByTestId('create-dialog')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'chat.threadCreateButton' }));

    expect(screen.getByTestId('create-dialog')).toBeInTheDocument();
  });

  it('says so when the list cannot be loaded', () => {
    publicationsState = { data: [], isLoading: false, isError: true };
    render(<ThreadPublicationsPage />);

    expect(screen.getByRole('alert')).toHaveTextContent('chat.threadPublicationsLoadFailed');
  });
});
