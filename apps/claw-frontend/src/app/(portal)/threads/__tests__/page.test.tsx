import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import ThreadPublicationsPage from '../page';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('@/components/threads/thread-list-view', () => ({
  ThreadListView: () => <div data-testid="thread-list-view" />,
}));
vi.mock('@/components/threads/thread-list-states', () => ({
  ThreadListSkeleton: () => <div data-testid="thread-list-skeleton" />,
}));
vi.mock('@/components/threads/thread-create-dialog', () => ({
  ThreadCreateDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="create-dialog" /> : null,
}));

describe('Threads list page', () => {
  it('has the title, the list and no creation form on the page', () => {
    render(<ThreadPublicationsPage />);

    expect(screen.getByRole('heading', { name: 'chat.threads' })).toBeInTheDocument();
    expect(screen.getByTestId('thread-list-view')).toBeInTheDocument();
    expect(screen.queryByTestId('create-dialog')).not.toBeInTheDocument();
  });

  it('links to My suggestions', () => {
    render(<ThreadPublicationsPage />);

    expect(screen.getByRole('link', { name: 'chat.threadCrMineLink' })).toHaveAttribute(
      'href',
      '/threads/my/suggestions',
    );
  });

  it('Create a Thread opens the dialog', async () => {
    render(<ThreadPublicationsPage />);

    await userEvent.click(screen.getByRole('button', { name: /chat\.threadCreateButton/u }));

    expect(screen.getByTestId('create-dialog')).toBeInTheDocument();
  });
});
