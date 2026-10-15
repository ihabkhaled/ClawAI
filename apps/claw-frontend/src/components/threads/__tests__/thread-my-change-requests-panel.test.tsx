import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ThreadPublicationChangeRequestStatus as Status } from '@/enums/thread-publication-change-request-status.enum';
import { threadPublicationsRepository } from '@/repositories/threads/thread-publications.repository';

import { ThreadMyChangeRequestsPanel } from '../thread-my-change-requests-panel';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string>) =>
      params ? `${key}:${Object.values(params).join('|')}` : key,
  }),
}));
vi.mock('@/repositories/threads/thread-publications.repository', () => ({
  threadPublicationsRepository: { listMyChangeRequests: vi.fn() },
}));

function mine(id: string, status: Status, overrides: Record<string, unknown> = {}) {
  return {
    id,
    suggestion: `Suggestion ${id}`,
    status,
    ownerResponse: null,
    createdAt: '2026-10-15T10:00:00.000Z',
    updatedAt: '2026-10-15T11:00:00.000Z',
    thread: { slug: 'plants-1', title: 'Plants', isPublic: true },
    ...overrides,
  };
}

function renderPanel() {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <ThreadMyChangeRequestsPanel />
    </QueryClientProvider>,
  );
}

describe('ThreadMyChangeRequestsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.location.hash = '';
  });

  it("lists the person's suggestions with the Thread, the status and the owner reply", async () => {
    vi.mocked(threadPublicationsRepository.listMyChangeRequests).mockResolvedValue([
      mine('a', Status.Pending),
      mine('b', Status.Rejected, { ownerResponse: 'Out of scope' }),
      mine('c', Status.Applied),
    ]);
    renderPanel();

    const items = await screen.findAllByTestId('thread-my-change-request');
    expect(items).toHaveLength(3);
    expect(
      within(items[0] as HTMLElement).getByText('chat.threadChangeRequestPENDING'),
    ).toBeInTheDocument();
    expect(
      within(items[1] as HTMLElement).getByText('chat.threadCrStatusDeclined'),
    ).toBeInTheDocument();
    expect(within(items[1] as HTMLElement).getByText('Out of scope')).toBeInTheDocument();
    expect(
      within(items[2] as HTMLElement).getByText('chat.threadCrStatusApplied'),
    ).toBeInTheDocument();
    expect(
      within(items[0] as HTMLElement).getByText('chat.threadCrMineOnThread:Plants'),
    ).toBeInTheDocument();
  });

  it('links to the Thread only while it is public', async () => {
    vi.mocked(threadPublicationsRepository.listMyChangeRequests).mockResolvedValue([
      mine('a', Status.Accepted),
      mine('b', Status.Accepted, { thread: { slug: 'gone', title: '', isPublic: false } }),
    ]);
    renderPanel();

    const items = await screen.findAllByTestId('thread-my-change-request');
    expect(within(items[0] as HTMLElement).getByRole('link')).toHaveAttribute(
      'href',
      '/threads/plants-1',
    );
    expect(within(items[1] as HTMLElement).queryByRole('link')).toBeNull();
    expect(
      within(items[1] as HTMLElement).getByText('chat.threadCrMineOnThread:chat.threadCrUntitled'),
    ).toBeInTheDocument();
  });

  it('scrolls to and highlights the suggestion a notification points at', async () => {
    window.location.hash = '#change-request-b';
    Element.prototype.scrollIntoView = vi.fn();
    vi.mocked(threadPublicationsRepository.listMyChangeRequests).mockResolvedValue([
      mine('a', Status.Pending),
      mine('b', Status.Accepted),
    ]);
    renderPanel();

    await waitFor(() =>
      expect(document.getElementById('change-request-b')?.className).toContain('ring-2'),
    );
    expect(document.getElementById('change-request-a')?.className).not.toContain('ring-2');
  });

  it('says so when there are none, and when loading fails', async () => {
    vi.mocked(threadPublicationsRepository.listMyChangeRequests).mockResolvedValueOnce([]);
    const { unmount } = renderPanel();
    expect(await screen.findByText('chat.threadCrMineEmpty')).toBeInTheDocument();
    unmount();

    vi.mocked(threadPublicationsRepository.listMyChangeRequests).mockRejectedValueOnce(
      new Error('x'),
    );
    renderPanel();
    expect(await screen.findByRole('alert')).toHaveTextContent('chat.threadCrMineLoadFailed');
  });
});
