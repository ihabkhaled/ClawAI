import type { UseQueryResult } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ThreadPublicationStatus } from '@/enums/thread-publication-status.enum';
import { ApiClientError } from '@/services/shared/api-client';
import type {
  ThreadGenerationState,
  ThreadPublicationDetailController,
} from '@/types/thread-publication.types';

import { ThreadPublicationDetail } from '../thread-publication-detail';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('../thread-generation-progress-panel', () => ({
  ThreadGenerationProgressPanel: ({
    canDelete,
    onCancel,
  }: {
    canDelete: boolean;
    onCancel: () => void;
  }) => (
    <button
      type="button"
      data-testid="progress-panel"
      data-can-delete={canDelete}
      onClick={onCancel}
    >
      panel
    </button>
  ),
}));
vi.mock('../thread-export-panel', () => ({ ThreadExportPanel: () => <div /> }));
vi.mock('../thread-share-menu', () => ({ ThreadShareMenu: () => <div /> }));
vi.mock('../thread-change-requests', () => ({ ThreadChangeRequests: () => <div /> }));

function mutation(overrides: Record<string, unknown> = {}) {
  return {
    mutate: vi.fn(),
    reset: vi.fn(),
    isPending: false,
    isSuccess: false,
    isError: false,
    error: null,
    ...overrides,
  };
}

function makeDetail(
  overrides: Partial<ThreadPublicationDetailController> = {},
  generation: Partial<UseQueryResult<ThreadGenerationState>> = {},
): ThreadPublicationDetailController {
  return {
    publicationId: 'pub-1',
    selectedPublication: undefined,
    generation: {
      isFetching: false,
      isError: false,
      error: null,
      data: {
        publicationId: 'pub-1',
        publicationStatus: 'DRAFT',
        jobId: 'job-1',
        status: 'FAILED',
        stage: 'AUTHOR_DRAFTS',
        round: 1,
        safeErrorCode: null,
        draft: null,
      },
      ...generation,
    },
    revisionReview: mutation({ data: undefined }),
    cancel: mutation(),
    publish: mutation(),
    editRevision: mutation(),
    unpublish: mutation(),
    buildExportFile: vi.fn(),
    publicUrl: null,
    editingRevision: false,
    setEditingRevision: vi.fn(),
    revisionMarkdown: '',
    revisionCapUsd: '',
    activeRevisionId: '',
    hasDraft: false,
    generationFailed: true,
    generationCancelled: false,
    publicationReady: false,
    revisionIsTerminal: false,
    revisionReviewMessage: '',
    startEditing: vi.fn(),
    changeRevisionField: vi.fn(),
    startRevisionFromChangeRequest: vi.fn(),
    ...overrides,
  } as unknown as ThreadPublicationDetailController;
}

describe('ThreadPublicationDetail', () => {
  it('always shows the owner progress panel, with Cancel wired to the cancel mutation', async () => {
    const detail = makeDetail();
    render(<ThreadPublicationDetail detail={detail} />);

    await userEvent.click(screen.getByTestId('progress-panel'));

    expect(detail.cancel.mutate).toHaveBeenCalledTimes(1);
  });

  it('no longer shows the catch-all failure sentence for a failed generation', () => {
    render(<ThreadPublicationDetail detail={makeDetail()} />);

    expect(screen.queryByText('chat.threadCreateFailed')).not.toBeInTheDocument();
  });

  it('lets the owner delete anything that is not published', () => {
    render(<ThreadPublicationDetail detail={makeDetail()} />);

    expect(screen.getByTestId('progress-panel')).toHaveAttribute('data-can-delete', 'true');
  });

  it('hides delete for a published Thread', () => {
    const published = {
      id: 'pub-1',
      status: ThreadPublicationStatus.Published,
      title: 'T',
      slug: 't',
      updatedAt: '2026-10-13',
    };
    render(<ThreadPublicationDetail detail={makeDetail({ selectedPublication: published })} />);

    expect(screen.getByTestId('progress-panel')).toHaveAttribute('data-can-delete', 'false');
  });

  it('explains a failed generation fetch by status, but leaves 404 to the panel', () => {
    const { rerender } = render(
      <ThreadPublicationDetail
        detail={makeDetail(
          {},
          { isError: true, error: new ApiClientError({ message: 'x', status: 402 }) },
        )}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('chat.threadProgress.error.credit');

    rerender(
      <ThreadPublicationDetail
        detail={makeDetail(
          {},
          { isError: true, error: new ApiClientError({ message: 'x', status: 404 }) },
        )}
      />,
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows the cancellation notices from the cancel mutation', () => {
    render(
      <ThreadPublicationDetail
        detail={makeDetail({ cancel: mutation({ isError: true }) as never })}
      />,
    );
    expect(screen.getByText('chat.threadCancellationFailed')).toBeInTheDocument();
  });

  it('shows the revision, unpublish and publish errors by status', () => {
    render(
      <ThreadPublicationDetail
        detail={makeDetail({
          unpublish: mutation({
            isError: true,
            error: new ApiClientError({ message: 'x', status: 404 }),
          }) as never,
          publish: mutation({
            isError: true,
            error: new ApiClientError({ message: 'x', status: 402 }),
          }) as never,
        })}
      />,
    );
    const alerts = screen.getAllByRole('alert').map((alert) => alert.textContent);
    expect(alerts).toContain('chat.threadProgress.error.notFound');
    expect(alerts).toContain('chat.threadProgress.error.credit');
  });
});
