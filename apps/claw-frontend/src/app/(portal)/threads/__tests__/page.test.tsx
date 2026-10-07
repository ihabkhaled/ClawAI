import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ThreadPublicationsPage from '../page';

let publicationsState: {
  data: Array<{ id: string; title: string | null; updatedAt: string }>;
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
