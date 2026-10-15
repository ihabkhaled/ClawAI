import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ThreadPublicationChangeRequestStatus } from '@/enums/thread-publication-change-request-status.enum';
import { en } from '@/lib/i18n/locales/en';
import { resolveTranslation } from '@/lib/i18n/translation-resolver';
import { threadPublicationsRepository } from '@/repositories/threads/thread-publications.repository';

import { ThreadChangeRequests } from '../thread-change-requests';

// The REAL English dictionary: a key-echo mock hides a dropped `chat.` prefix.
vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string>) => resolveTranslation(en, key, params),
  }),
}));
vi.mock('@/repositories/threads/thread-publications.repository', () => ({
  threadPublicationsRepository: { listChangeRequests: vi.fn(), resolveChangeRequest: vi.fn() },
}));

function request(id: string, status: ThreadPublicationChangeRequestStatus) {
  return {
    id,
    suggestion: `Suggestion ${id}`,
    status,
    ownerResponse: null,
    acceptedRevisionId: null,
    createdAt: '2026-10-05T12:00:00.000Z',
    requester: null,
  };
}

describe('ThreadChangeRequests status labels', () => {
  beforeEach(() => {
    vi.mocked(threadPublicationsRepository.listChangeRequests).mockResolvedValue([
      request('a', ThreadPublicationChangeRequestStatus.Pending),
      request('b', ThreadPublicationChangeRequestStatus.Accepted),
      request('c', ThreadPublicationChangeRequestStatus.Rejected),
      request('d', ThreadPublicationChangeRequestStatus.Applied),
    ]);
  });

  it('shows Pending, Accepted, Declined and Applied as words, never as threadChangeRequestPENDING', async () => {
    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <ThreadChangeRequests
          publicationId="pub-1"
          revisionSource={null}
          onRevisionStarted={vi.fn()}
        />
      </QueryClientProvider>,
    );

    await screen.findByText('Suggestion a');
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('Accepted')).toBeInTheDocument();
    expect(screen.getByText('Declined')).toBeInTheDocument();
    expect(screen.getByText('Applied')).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/threadChangeRequest[A-Z]/u);
  });

  it('uses a different badge colour per status', async () => {
    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <ThreadChangeRequests
          publicationId="pub-1"
          revisionSource={null}
          onRevisionStarted={vi.fn()}
        />
      </QueryClientProvider>,
    );

    await screen.findByText('Suggestion a');
    const classes = ['Pending', 'Accepted', 'Declined', 'Applied'].map(
      (label) => screen.getByText(label).className,
    );
    expect(new Set(classes).size).toBe(4);
  });
});
