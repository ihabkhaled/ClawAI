import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ThreadListStatus } from '@/enums/thread-list-status.enum';
import type { ThreadListController, ThreadListItem } from '@/types/thread-list.types';

import { ThreadListView } from '../thread-list-view';

let controller: ThreadListController;

vi.mock('@/hooks/threads/use-thread-list', () => ({ useThreadList: () => controller }));
vi.mock('@/hooks/use-locale', () => ({ useLocale: () => ({ locale: 'en', dir: 'ltr' }) }));
vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    locale: 'en',
    t: (key: string, params?: Record<string, string | number>) =>
      key === 'pagination.showing'
        ? `Showing ${params?.from}-${params?.to} of ${params?.total}`
        : key,
  }),
}));
vi.mock('../thread-generation-delete-dialog', () => ({
  ThreadGenerationDeleteDialog: ({ remove }: { remove: { isOpen: boolean } }) =>
    remove.isOpen ? <div data-testid="delete-dialog" /> : null,
}));

const row = (id: string): ThreadListItem => ({
  id,
  title: `Thread ${id}`,
  slug: null,
  createdAt: '2026-10-30T10:00:00.000Z',
  updatedAt: '2026-10-30T10:00:00.000Z',
  status: ThreadListStatus.READY,
  publishedAt: null,
  failure: null,
  canPublish: true,
  canDelete: true,
});

const base = (): ThreadListController => ({
  state: { q: '', status: ThreadListStatus.ALL, page: 1 },
  search: '',
  setSearch: vi.fn(),
  clearSearch: vi.fn(),
  setStatus: vi.fn(),
  setPage: vi.fn(),
  clearFilters: vi.fn(),
  data: {
    items: Array.from({ length: 10 }, (_, index) => row(String(index))),
    page: 1,
    pageSize: 10,
    total: 25,
    totalPages: 3,
  },
  isLoading: false,
  isError: false,
  isFetching: false,
  refetch: vi.fn(),
  publishingId: null,
  publishError: null,
  publish: vi.fn(),
  remove: {
    isOpen: false,
    setOpen: vi.fn(),
    confirm: vi.fn(),
    isDeleting: false,
    error: null,
  },
  askDelete: vi.fn(),
});

describe('ThreadListView', () => {
  beforeEach(() => {
    controller = base();
  });

  it('shows a skeleton on the first load', () => {
    controller.isLoading = true;
    controller.data = undefined;
    render(<ThreadListView />);
    expect(screen.getByRole('status', { name: 'Loading your Threads' })).toBeInTheDocument();
  });

  it('shows an error with retry when nothing was loaded', async () => {
    controller.isError = true;
    controller.data = undefined;
    render(<ThreadListView />);
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(controller.refetch).toHaveBeenCalled();
  });

  it('keeps the rows on screen when a refresh fails', () => {
    controller.isError = true;
    render(<ThreadListView />);
    expect(screen.getAllByTestId('thread-list-row')).toHaveLength(10);
  });

  it('lists the rows with the range and page buttons', () => {
    render(<ThreadListView />);
    expect(screen.getAllByTestId('thread-list-row')).toHaveLength(10);
    expect(screen.getByTestId('pagination-summary')).toHaveTextContent('Showing 1-10 of 25');
  });

  it('Next goes to page 2; Previous is disabled on the first page', async () => {
    render(<ThreadListView />);
    expect(screen.getByRole('button', { name: 'pagination.previous' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'pagination.next' }));
    expect(controller.setPage).toHaveBeenCalledWith(2);
  });

  it('Next is disabled on the last page', () => {
    controller.data = { items: [row('x')], page: 3, pageSize: 10, total: 21, totalPages: 3 };
    controller.state = { ...controller.state, page: 3 };
    render(<ThreadListView />);
    expect(screen.getByRole('button', { name: 'pagination.next' })).toBeDisabled();
    expect(screen.getByTestId('pagination-summary')).toHaveTextContent('Showing 21-21 of 21');
  });

  it('shows no pagination when there are no rows, and the no-results message', () => {
    controller.state = { q: 'zzz', status: ThreadListStatus.ALL, page: 1 };
    controller.data = { items: [], page: 1, pageSize: 10, total: 0, totalPages: 0 };
    render(<ThreadListView />);
    expect(screen.queryByTestId('pagination')).not.toBeInTheDocument();
    expect(screen.getByTestId('thread-list-empty')).toHaveTextContent('No Threads match "zzz".');
  });

  it('never shows the empty state when rows are missing but the total is not zero', () => {
    controller.data = { items: [], page: 9, pageSize: 10, total: 15, totalPages: 2 };
    controller.state = { ...controller.state, page: 9 };
    render(<ThreadListView />);
    expect(screen.queryByTestId('thread-list-empty')).not.toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Loading your Threads' })).toBeInTheDocument();
  });

  it('has a focusable results heading and a polite Showing a-b of N announcement', () => {
    render(<ThreadListView />);
    const heading = screen.getByRole('heading', { name: 'Your Threads' });
    expect(heading).toHaveAttribute('tabindex', '-1');
    const announce = screen.getByTestId('thread-list-announce');
    expect(announce).toHaveAttribute('aria-live', 'polite');
    expect(announce).toHaveTextContent('Showing 1-10 of 25');
  });

  it('opens the delete dialog through the controller', () => {
    controller.remove = { ...controller.remove, isOpen: true };
    render(<ThreadListView />);
    expect(screen.getByTestId('delete-dialog')).toBeInTheDocument();
  });

  it('passes a row action to the controller', async () => {
    render(<ThreadListView />);
    await userEvent.click(screen.getByRole('button', { name: 'Publish Thread 0' }));
    expect(controller.publish).toHaveBeenCalledWith(expect.objectContaining({ id: '0' }));
    await userEvent.click(screen.getByRole('button', { name: 'Delete Thread 1' }));
    expect(controller.askDelete).toHaveBeenCalledWith(expect.objectContaining({ id: '1' }));
  });
});
