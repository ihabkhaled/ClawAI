import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ThreadFormatPanel } from '@/components/threads/format/thread-format-panel';
import { ApiClientError } from '@/services/shared/api-client';
import type { ThreadPublicationDetailController } from '@/types/thread-publication.types';

const previewMock = vi.fn();
const editRevisionMock = vi.fn();

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string | number>) =>
      params ? `${key}:${JSON.stringify(params)}` : key,
    locale: 'en',
    dir: 'ltr',
  }),
}));
vi.mock('@/repositories/threads/thread-format.repository', () => ({
  threadFormatRepository: { preview: (...args: unknown[]) => previewMock(...args) as unknown },
}));
vi.mock('@/repositories/threads/thread-publications.repository', () => ({
  threadPublicationsRepository: {
    editRevision: (...args: unknown[]) => editRevisionMock(...args) as unknown,
  },
}));

const citations = [{ evidenceId: 'a1b2c3d4', url: 'https://example.com/a' }];
const PREVIEW = {
  revisionId: 'rev-1',
  status: 'FORMATTED',
  code: null,
  contentLocale: 'en',
  originalMarkdown: '# Title\n\nA wall of text.',
  markdown: '# Title\n\n## Key takeaways\n\n- A point',
  citations,
  remainingToday: 2,
};

function detailStub(
  overrides: Partial<ThreadPublicationDetailController> = {},
): ThreadPublicationDetailController {
  return {
    publicationId: 'pub-1',
    generation: { data: { draft: { markdown: '# Title', citations } } },
    editingRevision: false,
    startRevisionFromChangeRequest: vi.fn(),
    ...overrides,
  } as unknown as ThreadPublicationDetailController;
}

function renderPanel(detail: ThreadPublicationDetailController): ReactElement {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const view = render(
    <QueryClientProvider client={client}>
      <ThreadFormatPanel detail={detail} />
    </QueryClientProvider>,
  );
  return view.container as unknown as ReactElement;
}

describe('ThreadFormatPanel', () => {
  beforeEach(() => {
    previewMock.mockReset();
    editRevisionMock.mockReset();
  });

  it('renders nothing before there is a draft, or while the owner edits by hand', () => {
    renderPanel(detailStub({ generation: { data: undefined } as never }));
    expect(screen.queryByTestId('thread-format-panel')).toBeNull();
  });

  it('previews, toggles before and after, and discards without saving anything', async () => {
    previewMock.mockResolvedValue(PREVIEW);
    renderPanel(detailStub());
    fireEvent.click(screen.getByRole('button', { name: 'threadArticle.formatRun' }));
    await screen.findByTestId('thread-format-preview');
    expect(previewMock).toHaveBeenCalledWith(
      'pub-1',
      expect.objectContaining({ idempotencyKey: expect.any(String) as string }),
    );
    expect(screen.getByTestId('thread-format-preview').textContent).toContain('Key takeaways');
    fireEvent.click(screen.getByRole('button', { name: 'threadArticle.formatBefore' }));
    expect(screen.getByTestId('thread-format-preview').textContent).toContain('A wall of text.');
    fireEvent.click(screen.getByRole('button', { name: 'threadArticle.formatDiscard' }));
    expect(screen.queryByTestId('thread-format-preview')).toBeNull();
    expect(editRevisionMock).not.toHaveBeenCalled();
  });

  it('saves the improved text as an ordinary edit, which is reviewed again', async () => {
    previewMock.mockResolvedValue(PREVIEW);
    editRevisionMock.mockResolvedValue({ revisionId: 'rev-2', status: 'PENDING' });
    const detail = detailStub();
    renderPanel(detail);
    fireEvent.click(screen.getByRole('button', { name: 'threadArticle.formatRun' }));
    await screen.findByTestId('thread-format-preview');
    fireEvent.click(screen.getByRole('button', { name: 'threadArticle.formatAccept' }));
    await waitFor(() => {
      expect(detail.startRevisionFromChangeRequest).toHaveBeenCalledWith('rev-2');
    });
    expect(editRevisionMock).toHaveBeenCalledWith(
      'pub-1',
      expect.objectContaining({
        markdown: PREVIEW.markdown,
        citations,
        capMicroUsd: 500_000,
      }),
    );
    expect(await screen.findByText('threadArticle.formatAccepted')).toBeTruthy();
  });

  it('says so when the article is already well formatted and offers no save', async () => {
    previewMock.mockResolvedValue({
      ...PREVIEW,
      status: 'SKIPPED',
      code: 'FORMAT_ALREADY_PRETTY',
      markdown: PREVIEW.originalMarkdown,
    });
    renderPanel(detailStub());
    fireEvent.click(screen.getByRole('button', { name: 'threadArticle.formatRun' }));
    expect(await screen.findByText('threadArticle.formatUnchanged')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'threadArticle.formatAccept' })).toBeNull();
  });

  it('shows the specific reason when the guard kept the original', async () => {
    previewMock.mockResolvedValue({
      ...PREVIEW,
      status: 'SKIPPED',
      code: 'FORMAT_CITATION_LOST',
      markdown: PREVIEW.originalMarkdown,
    });
    renderPanel(detailStub());
    fireEvent.click(screen.getByRole('button', { name: 'threadArticle.formatRun' }));
    expect(await screen.findByText('threadReview.formatCitationLost')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'threadArticle.formatAccept' })).toBeNull();
  });

  it('explains the daily limit and a guard refusal', async () => {
    previewMock.mockRejectedValueOnce(
      new ApiClientError({ message: 'x', status: 429, code: 'THREAD_FORMAT_DAILY_LIMIT' }),
    );
    renderPanel(detailStub());
    fireEvent.click(screen.getByRole('button', { name: 'threadArticle.formatRun' }));
    expect((await screen.findByRole('alert')).textContent).toBe('threadArticle.formatLimit');
  });

  it('shows a generic message when formatting fails', async () => {
    previewMock.mockRejectedValueOnce(new Error('boom'));
    renderPanel(detailStub());
    fireEvent.click(screen.getByRole('button', { name: 'threadArticle.formatRun' }));
    expect((await screen.findByRole('alert')).textContent).toBe('threadArticle.formatFailed');
  });
});
