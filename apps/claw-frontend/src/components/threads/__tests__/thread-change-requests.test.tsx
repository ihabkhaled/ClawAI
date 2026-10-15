import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ThreadPublicationChangeRequestStatus } from '@/enums/thread-publication-change-request-status.enum';
import { threadPublicationsRepository } from '@/repositories/threads/thread-publications.repository';

import { ThreadChangeRequests } from '../thread-change-requests';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string>) =>
      params ? `${key}:${Object.values(params).join('|')}` : key,
  }),
}));

vi.mock('@/repositories/threads/thread-publications.repository', () => ({
  threadPublicationsRepository: {
    listChangeRequests: vi.fn(),
    resolveChangeRequest: vi.fn(),
  },
}));

const requester = { displayName: 'Chen Charlie', username: 'qa8_c' };

const pendingRequest = {
  id: 'request-1',
  suggestion: 'Clarify the conclusion',
  status: ThreadPublicationChangeRequestStatus.Pending,
  ownerResponse: null,
  acceptedRevisionId: null,
  createdAt: '2026-10-05T12:00:00.000Z',
  requester,
};

const SOURCE = {
  markdown: '# Article\n\nCurrent draft.',
  citations: [{ evidenceId: 'evidence-1', url: 'https://source.example/article' }],
  judgeScore: 90,
  criticScore: 86,
};

function renderRequests(
  handlers: {
    onRevisionStarted?: () => void;
    onEditMyself?: (suggestion: { id: string; suggestion: string }) => void;
  } = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ThreadChangeRequests
        publicationId="publication-1"
        revisionSource={SOURCE}
        onRevisionStarted={handlers.onRevisionStarted ?? vi.fn()}
        {...(handlers.onEditMyself ? { onEditMyself: handlers.onEditMyself } : {})}
      />
    </QueryClientProvider>,
  );
}

describe('ThreadChangeRequests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.location.hash = '';
    vi.mocked(threadPublicationsRepository.listChangeRequests).mockResolvedValue([pendingRequest]);
  });

  afterEach(() => {
    window.location.hash = '';
  });

  it('shows who asked (name and @username), when, what, and the status', async () => {
    renderRequests();

    const card = await screen.findByTestId('thread-change-request');
    expect(within(card).getByText('Chen Charlie (@qa8_c)')).toBeInTheDocument();
    expect(within(card).getByText('Clarify the conclusion')).toBeInTheDocument();
    expect(within(card).getByTestId('relative-time')).toBeInTheDocument();
    expect(within(card).getByText('chat.threadChangeRequestPENDING')).toBeInTheDocument();
  });

  it('lists waiting suggestions before answered ones', async () => {
    vi.mocked(threadPublicationsRepository.listChangeRequests).mockResolvedValue([
      {
        ...pendingRequest,
        id: 'old',
        suggestion: 'Answered one',
        status: ThreadPublicationChangeRequestStatus.Rejected,
      },
      { ...pendingRequest, id: 'waiting', suggestion: 'Waiting one' },
    ]);
    renderRequests();

    const cards = await screen.findAllByTestId('thread-change-request');
    expect(cards.map((card) => card.id)).toEqual(['change-request-waiting', 'change-request-old']);
  });

  it('offers no decision on a request that was already answered', async () => {
    vi.mocked(threadPublicationsRepository.listChangeRequests).mockResolvedValue([
      { ...pendingRequest, status: ThreadPublicationChangeRequestStatus.Applied },
    ]);
    renderRequests();

    await screen.findByText('Clarify the conclusion');
    expect(screen.queryByRole('button', { name: 'chat.threadChangeAccept' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'chat.threadCrDecline' })).toBeNull();
  });

  it('lets the owner decline a request with a short reason', async () => {
    const user = userEvent.setup();
    vi.mocked(threadPublicationsRepository.resolveChangeRequest).mockResolvedValue({
      resolved: true,
      edit: null,
    });
    renderRequests();

    await screen.findByText('Clarify the conclusion');
    await user.type(screen.getByLabelText('chat.threadCrDeclineReason'), 'Outside this article');
    await user.click(screen.getByRole('button', { name: 'chat.threadCrDecline' }));

    await waitFor(() =>
      expect(threadPublicationsRepository.resolveChangeRequest).toHaveBeenCalledWith(
        'publication-1',
        'request-1',
        {
          status: ThreadPublicationChangeRequestStatus.Rejected,
          ownerResponse: 'Outside this article',
        },
      ),
    );
  });

  it('asks how to apply an accepted request before doing anything', async () => {
    const user = userEvent.setup();
    renderRequests();

    await screen.findByText('Clarify the conclusion');
    await user.click(screen.getByRole('button', { name: 'chat.threadChangeAccept' }));

    expect(screen.getByRole('button', { name: 'chat.threadCrApplyWithAi' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'chat.threadCrEditMyself' })).toBeInTheDocument();
    expect(threadPublicationsRepository.resolveChangeRequest).not.toHaveBeenCalled();
  });

  it('starts capped revalidation before accepting a requested change (apply with AI review)', async () => {
    const user = userEvent.setup();
    const onRevisionStarted = vi.fn();
    vi.mocked(threadPublicationsRepository.resolveChangeRequest).mockResolvedValue({
      resolved: true,
      edit: {
        revisionId: 'revision-2',
        status: 'PENDING',
        reviewJobId: 'review-job-2',
        reasons: [],
      },
    });
    renderRequests({ onRevisionStarted });

    await screen.findByText('Clarify the conclusion');
    await user.click(screen.getByRole('button', { name: 'chat.threadChangeAccept' }));
    await user.click(screen.getByRole('button', { name: 'chat.threadCrApplyWithAi' }));
    const submit = screen.getByRole('button', { name: 'chat.threadSubmitChangeDecision' });
    expect(submit).toBeDisabled();
    await user.clear(screen.getByLabelText('chat.threadRevisionContent'));
    await user.type(
      screen.getByLabelText('chat.threadRevisionContent'),
      '# Article\n\nClarified conclusion.',
    );
    await user.clear(screen.getByLabelText('chat.threadRevisionCap'));
    await user.type(screen.getByLabelText('chat.threadRevisionCap'), '0.50');
    await user.click(submit);

    await waitFor(() =>
      expect(threadPublicationsRepository.resolveChangeRequest).toHaveBeenCalledWith(
        'publication-1',
        'request-1',
        expect.objectContaining({
          status: ThreadPublicationChangeRequestStatus.Accepted,
          revision: expect.objectContaining({
            markdown: '# Article\n\nClarified conclusion.',
            citations: [{ evidenceId: 'evidence-1', url: 'https://source.example/article' }],
            capMicroUsd: 500_000,
          }),
        }),
      ),
    );
    expect(onRevisionStarted).toHaveBeenCalledWith('revision-2');
  });

  it('accepts without a revision and opens the editor when the owner will edit it themselves', async () => {
    const user = userEvent.setup();
    const onEditMyself = vi.fn();
    vi.mocked(threadPublicationsRepository.resolveChangeRequest).mockResolvedValue({
      resolved: true,
      edit: null,
    });
    renderRequests({ onEditMyself });

    await screen.findByText('Clarify the conclusion');
    await user.click(screen.getByRole('button', { name: 'chat.threadChangeAccept' }));
    await user.click(screen.getByRole('button', { name: 'chat.threadCrEditMyself' }));

    await waitFor(() => expect(onEditMyself).toHaveBeenCalledTimes(1));
    expect(onEditMyself).toHaveBeenCalledWith({
      id: 'request-1',
      suggestion: 'Clarify the conclusion',
    });
    expect(threadPublicationsRepository.resolveChangeRequest).toHaveBeenCalledWith(
      'publication-1',
      'request-1',
      { status: ThreadPublicationChangeRequestStatus.Accepted },
    );
  });

  it('highlights and scrolls to the suggestion a notification link points at', async () => {
    window.location.hash = '#change-request-request-1';
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    renderRequests();

    const card = await screen.findByTestId('thread-change-request');
    await waitFor(() => expect(card.className).toContain('ring-2'));
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'start' });
    expect(card.id).toBe('change-request-request-1');
  });

  it('clamps a 5000-character suggestion and toggles Show more / Show less', async () => {
    const user = userEvent.setup();
    const long = 'word '.repeat(1000);
    vi.mocked(threadPublicationsRepository.listChangeRequests).mockResolvedValue([
      { ...pendingRequest, suggestion: long },
    ]);
    renderRequests();

    const card = await screen.findByTestId('thread-change-request');
    expect(card.textContent?.length ?? 0).toBeLessThan(1500);
    await user.click(within(card).getByRole('button', { name: 'threadReview.showMore' }));
    expect(card.textContent).toContain(long.trim());
    await user.click(within(card).getByRole('button', { name: 'threadReview.showLess' }));
    expect(card.textContent?.length ?? 0).toBeLessThan(1500);
  });

  it('shows no toggle for a short suggestion', async () => {
    renderRequests();

    const card = await screen.findByTestId('thread-change-request');
    expect(within(card).queryByRole('button', { name: 'threadReview.showMore' })).toBeNull();
  });

  it('says the request was already answered when the service returns unchanged', async () => {
    const user = userEvent.setup();
    const onEditMyself = vi.fn();
    vi.mocked(threadPublicationsRepository.resolveChangeRequest).mockResolvedValue({
      resolved: true,
      edit: null,
      unchanged: true,
    });
    renderRequests({ onEditMyself });

    await screen.findByText('Clarify the conclusion');
    await user.click(screen.getByRole('button', { name: 'chat.threadChangeAccept' }));
    await user.click(screen.getByRole('button', { name: 'chat.threadCrEditMyself' }));

    expect(await screen.findByTestId('thread-cr-unchanged')).toHaveTextContent(
      'threadReview.alreadyAnswered',
    );
    expect(onEditMyself).not.toHaveBeenCalled();
  });

  it('does not highlight anything when the address names no suggestion in the list', async () => {
    window.location.hash = '#change-request-someone-elses';
    renderRequests();

    const card = await screen.findByTestId('thread-change-request');
    expect(card.className).not.toContain('ring-2');
  });
});
