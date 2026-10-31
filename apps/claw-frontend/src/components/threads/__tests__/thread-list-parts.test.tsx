import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ThreadListStatus } from '@/enums/thread-list-status.enum';
import type { ThreadListItem } from '@/types/thread-list.types';

import { ThreadListRow } from '../thread-list-row';
import { ThreadListEmpty, ThreadListError, ThreadListSkeleton } from '../thread-list-states';
import { ThreadListToolbar } from '../thread-list-toolbar';

vi.mock('@/hooks/use-locale', () => ({ useLocale: () => ({ locale: 'en', dir: 'ltr' }) }));
vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    locale: 'en',
    t: (key: string) => (key === 'chat.untitled' ? 'Untitled' : key),
  }),
}));

const item = (over: Partial<ThreadListItem> = {}): ThreadListItem => ({
  id: 'p1',
  title: 'Local-first AI',
  slug: 'local-first-ai',
  createdAt: '2026-10-30T10:00:00.000Z',
  updatedAt: '2026-10-30T10:00:00.000Z',
  status: ThreadListStatus.READY,
  publishedAt: null,
  failure: null,
  canPublish: true,
  canDelete: true,
  ...over,
});

const renderRow = (over: Partial<ThreadListItem>, extra: Record<string, unknown> = {}) => {
  const props = {
    onPublish: vi.fn(),
    onDelete: vi.fn(),
    isPublishing: false,
    publishError: null,
    ...extra,
  };
  render(
    <ul>
      <ThreadListRow item={item(over)} {...props} />
    </ul>,
  );
  return props;
};

describe('ThreadListRow', () => {
  it('shows the title as a link to the owner page, and the created date', () => {
    renderRow({});
    expect(screen.getByRole('link', { name: 'Local-first AI' })).toHaveAttribute(
      'href',
      '/threads/review/p1',
    );
    expect(screen.getByText(/Created .*2026/u)).toBeInTheDocument();
  });

  it('falls back to Untitled', () => {
    renderRow({ title: null });
    expect(screen.getByRole('link', { name: 'Untitled' })).toBeInTheDocument();
  });

  it('Publish button calls onPublish for a publishable row', async () => {
    const props = renderRow({});
    await userEvent.click(screen.getByRole('button', { name: 'Publish Local-first AI' }));
    expect(props.onPublish).toHaveBeenCalledWith(expect.objectContaining({ id: 'p1' }));
  });

  it('disables Publish while it runs and shows the error', () => {
    renderRow(
      {},
      { isPublishing: true, publishError: { key: 'chat.threadProgress.error.conflict' } },
    );
    expect(screen.getByRole('button', { name: 'Publish Local-first AI' })).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent('chat.threadProgress.error.conflict');
  });

  it('has no Publish button when not publishable', () => {
    renderRow({ canPublish: false });
    expect(screen.queryByRole('button', { name: /^Publish/u })).not.toBeInTheDocument();
  });

  it('a published row shows the Published chip and a link to the public Thread, no Publish', () => {
    renderRow({
      status: ThreadListStatus.PUBLISHED,
      canPublish: false,
      publishedAt: '2026-10-31T10:00:00.000Z',
    });
    expect(screen.getByTestId('thread-list-published')).toHaveTextContent('Published');
    expect(screen.getByRole('link', { name: 'View the public Thread' })).toHaveAttribute(
      'href',
      '/board/local-first-ai',
    );
    expect(screen.queryByRole('button', { name: /^Publish/u })).not.toBeInTheDocument();
  });

  it('a failed row shows the icon with a label and the translated reason, never raw text', () => {
    renderRow({
      status: ThreadListStatus.FAILED,
      canPublish: false,
      failure: { code: 'PROVIDER_UNAVAILABLE', retryable: true, step: 'DRAFT' },
    });
    expect(screen.getByRole('img', { name: 'Generation failed' })).toBeInTheDocument();
    expect(screen.getByTestId('thread-list-failed')).toHaveTextContent(
      'chat.threadProgress.code.providerUnavailable You can retry it.',
    );
  });

  it('a cancelled row says so in words, not with the code', () => {
    renderRow({
      status: ThreadListStatus.FAILED,
      failure: { code: 'JOB_CANCELLED', retryable: true, step: null },
    });
    const text = screen.getByTestId('thread-list-failed').textContent ?? '';
    expect(text).toContain('You cancelled this generation.');
    expect(text).not.toContain('JOB_CANCELLED');
  });

  it('an unknown code gets the generic sentence, never the code', () => {
    renderRow({
      status: ThreadListStatus.FAILED,
      failure: { code: 'ODD_PROVIDER_CODE', retryable: false, step: null },
    });
    const text = screen.getByTestId('thread-list-failed').textContent ?? '';
    expect(text).toContain('The generation did not finish.');
    expect(text).not.toContain('ODD_PROVIDER_CODE');
  });

  it('a failed row that cannot be retried omits the hint', () => {
    renderRow({
      status: ThreadListStatus.FAILED,
      failure: { code: 'CITATION_INVALID', retryable: false, step: null },
    });
    expect(screen.getByTestId('thread-list-failed')).not.toHaveTextContent('You can retry it.');
  });

  it('a generating row shows the Generating chip', () => {
    renderRow({ status: ThreadListStatus.GENERATING, canPublish: false });
    expect(screen.getByTestId('thread-list-generating')).toHaveTextContent('Generating');
  });

  it('Delete asks the page, and is absent when not allowed', async () => {
    const props = renderRow({});
    await userEvent.click(screen.getByRole('button', { name: 'Delete Local-first AI' }));
    expect(props.onDelete).toHaveBeenCalledTimes(1);
  });

  it('hides Delete when the service says no', () => {
    renderRow({ canDelete: false });
    expect(screen.queryByRole('button', { name: /^Delete/u })).not.toBeInTheDocument();
  });
});

describe('ThreadListToolbar', () => {
  const setup = (search = '') => {
    const props = {
      search,
      onSearchChange: vi.fn(),
      onSearchClear: vi.fn(),
      status: ThreadListStatus.ALL,
      onStatusChange: vi.fn(),
    };
    render(<ThreadListToolbar {...props} />);
    return props;
  };

  it('reports typing and has no clear button while empty', async () => {
    const props = setup();
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search your Threads' }), 'a');
    expect(props.onSearchChange).toHaveBeenCalledWith('a');
    expect(screen.queryByTestId('thread-list-search-clear')).not.toBeInTheDocument();
  });

  it('the clear button clears and is keyboard reachable', async () => {
    const props = setup('abc');
    await userEvent.tab();
    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'Clear search' })).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    expect(props.onSearchClear).toHaveBeenCalledTimes(1);
  });

  it('offers the five statuses', async () => {
    setup();
    await userEvent.click(screen.getByRole('combobox', { name: 'Status' }));
    for (const label of ['All', 'Generating', 'Ready', 'Published', 'Failed']) {
      expect(screen.getByRole('option', { name: label })).toBeInTheDocument();
    }
  });

  it('choosing a status reports it', async () => {
    const props = setup();
    await userEvent.click(screen.getByRole('combobox', { name: 'Status' }));
    await userEvent.click(screen.getByRole('option', { name: 'Failed' }));
    expect(props.onStatusChange).toHaveBeenCalledWith(ThreadListStatus.FAILED);
  });
});

describe('ThreadListEmpty / Error / Skeleton', () => {
  it('names the search that matched nothing and offers to clear', async () => {
    const onClear = vi.fn();
    render(<ThreadListEmpty query="zzz" status={ThreadListStatus.ALL} onClear={onClear} />);
    expect(screen.getByTestId('thread-list-empty')).toHaveTextContent('No Threads match "zzz".');
    await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(onClear).toHaveBeenCalled();
  });

  it('a status with no rows says so', () => {
    render(<ThreadListEmpty query="" status={ThreadListStatus.FAILED} onClear={vi.fn()} />);
    expect(screen.getByTestId('thread-list-empty')).toHaveTextContent(
      'No Threads with this status.',
    );
  });

  it('no Threads at all shows the plain empty message and no clear button', () => {
    render(<ThreadListEmpty query="" status={ThreadListStatus.ALL} onClear={vi.fn()} />);
    expect(screen.getByTestId('thread-list-empty')).toHaveTextContent('chat.noThreads');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('the error state retries', async () => {
    const onRetry = vi.fn();
    render(<ThreadListError onRetry={onRetry} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Could not load your Threads.');
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalled();
  });

  it('the skeleton is a labelled status region', () => {
    render(<ThreadListSkeleton />);
    expect(screen.getByRole('status', { name: 'Loading your Threads' })).toBeInTheDocument();
  });
});
