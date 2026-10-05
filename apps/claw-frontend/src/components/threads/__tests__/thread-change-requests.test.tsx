import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ThreadPublicationChangeRequestStatus } from '@/enums/thread-publication-change-request-status.enum';
import { threadPublicationsRepository } from '@/repositories/threads/thread-publications.repository';

import { ThreadChangeRequests } from '../thread-change-requests';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@/repositories/threads/thread-publications.repository', () => ({
  threadPublicationsRepository: {
    listChangeRequests: vi.fn(),
    resolveChangeRequest: vi.fn(),
  },
}));

const pendingRequest = {
  id: 'request-1',
  suggestion: 'Clarify the conclusion',
  status: ThreadPublicationChangeRequestStatus.Pending,
  ownerResponse: null,
  acceptedRevisionId: null,
  createdAt: '2026-10-05T12:00:00.000Z',
};

function renderRequests(onRevisionStarted = vi.fn()) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ThreadChangeRequests
        publicationId="publication-1"
        revisionSource={{
          markdown: '# Article\n\nCurrent draft.',
          citations: [{ evidenceId: 'evidence-1', url: 'https://source.example/article' }],
          judgeScore: 90,
          criticScore: 86,
        }}
        onRevisionStarted={onRevisionStarted}
      />
    </QueryClientProvider>,
  );
}

describe('ThreadChangeRequests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(threadPublicationsRepository.listChangeRequests).mockResolvedValue([pendingRequest]);
  });

  it('lets the owner reject a request with a response', async () => {
    const user = userEvent.setup();
    vi.mocked(threadPublicationsRepository.resolveChangeRequest).mockResolvedValue({
      resolved: true,
      edit: null,
    });
    renderRequests();

    await screen.findByText('Clarify the conclusion');
    await user.type(screen.getByLabelText('threadResponseToRequester'), 'Outside this article');
    await user.click(screen.getByRole('button', { name: 'threadChangeReject' }));

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

  it('starts capped revalidation before accepting a requested change', async () => {
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
    renderRequests(onRevisionStarted);

    await screen.findByText('Clarify the conclusion');
    await user.click(screen.getByRole('button', { name: 'threadChangeAccept' }));
    const submit = screen.getByRole('button', { name: 'threadSubmitChangeDecision' });
    expect(submit).toBeDisabled();
    await user.clear(screen.getByLabelText('threadRevisionContent'));
    await user.type(
      screen.getByLabelText('threadRevisionContent'),
      '# Article\n\nClarified conclusion.',
    );
    await user.clear(screen.getByLabelText('threadRevisionCap'));
    await user.type(screen.getByLabelText('threadRevisionCap'), '0.50');
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
});
