import type { UseQueryResult } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
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
vi.mock('../format/thread-format-panel', () => ({ ThreadFormatPanel: () => <div /> }));
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
      pendingChangeRequests: 0,
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

const READY_DRAFT = {
  markdown: '# Heat pumps',
  citations: [{ evidenceId: 'e-1', url: 'https://source.example/heat' }],
  judgeScore: 90,
  criticScore: 88,
};

function readyGeneration() {
  return {
    data: {
      publicationId: 'pub-1',
      publicationStatus: 'READY_FOR_REVIEW',
      jobId: 'job-1',
      status: 'WAITING_FOR_REVIEW',
      stage: 'READY_FOR_REVIEW',
      round: 1,
      safeErrorCode: null,
      draft: READY_DRAFT,
    },
  };
}

describe('ThreadPublicationDetail owner actions and publish banner', () => {
  it('shows the live banner with the address and an Open live Thread link after publish', () => {
    const detail = makeDetail(
      {
        publish: mutation({ isSuccess: true }) as never,
        publicUrl: 'https://claw.local/threads/abc',
        hasDraft: true,
        generationFailed: false,
      },
      readyGeneration(),
    );
    render(<ThreadPublicationDetail detail={detail} />);

    expect(screen.getByTestId('thread-live-banner')).toBeInTheDocument();
    expect(screen.getByLabelText('chat.threadLiveLinkLabel')).toHaveValue(
      'https://claw.local/threads/abc',
    );
    const open = screen.getByRole('link', { name: 'chat.threadLiveOpen' });
    expect(open).toHaveAttribute('href', 'https://claw.local/threads/abc');
    expect(open).toHaveAttribute('target', '_blank');
    expect(open).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.queryByRole('button', { name: 'chat.threadApproveAndPublish' })).toBeNull();
  });

  it('falls back to the one-line notice until the public address is known', () => {
    const detail = makeDetail(
      { publish: mutation({ isSuccess: true }) as never, publicUrl: null, hasDraft: true },
      readyGeneration(),
    );
    render(<ThreadPublicationDetail detail={detail} />);

    expect(screen.queryByTestId('thread-live-banner')).toBeNull();
    expect(screen.getByText('chat.threadPublished')).toBeInTheDocument();
  });

  it('does not show the banner before anything was published', () => {
    const detail = makeDetail({ hasDraft: true, publicationReady: true }, readyGeneration());
    render(<ThreadPublicationDetail detail={detail} />);

    expect(screen.queryByTestId('thread-live-banner')).toBeNull();
  });

  it('offers Edit draft and Approve and publish together, and publishes on click', async () => {
    const detail = makeDetail(
      { hasDraft: true, publicationReady: true, generationFailed: false },
      readyGeneration(),
    );
    render(<ThreadPublicationDetail detail={detail} />);

    await userEvent.click(screen.getByRole('button', { name: 'chat.threadEditDraft' }));
    expect(detail.startEditing).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole('button', { name: 'chat.threadApproveAndPublish' }));
    expect(detail.publish.mutate).toHaveBeenCalledTimes(1);
  });

  it('offers Unpublish for a published Thread and wires it to the mutation', async () => {
    const published = {
      id: 'pub-1',
      status: ThreadPublicationStatus.Published,
      title: 'T',
      slug: 't',
      updatedAt: '2026-10-13',
      pendingChangeRequests: 0,
    };
    const detail = makeDetail(
      { selectedPublication: published, hasDraft: true, generationFailed: false },
      readyGeneration(),
    );
    render(<ThreadPublicationDetail detail={detail} />);

    await userEvent.click(screen.getByRole('button', { name: 'chat.threadUnpublish' }));
    expect(detail.unpublish.mutate).toHaveBeenCalledTimes(1);
  });

  it('shows the draft in a read-only field a keyboard can reach and scroll', () => {
    const detail = makeDetail({ hasDraft: true, generationFailed: false }, readyGeneration());
    render(<ThreadPublicationDetail detail={detail} />);

    const preview = screen.getByTestId('thread-draft-preview');
    expect(preview).toHaveValue('# Heat pumps');
    expect(preview).toHaveAttribute('readonly');
    expect(preview).toHaveAccessibleName('chat.threadDraftPreview');
  });

  it('edits the revision with the shared fields and cancels with an icon button', async () => {
    const detail = makeDetail(
      { hasDraft: true, editingRevision: true, revisionMarkdown: 'Body', revisionCapUsd: '0.5' },
      readyGeneration(),
    );
    render(<ThreadPublicationDetail detail={detail} />);

    expect(screen.getByLabelText('chat.threadRevisionContent')).toHaveValue('Body');
    expect(screen.getByLabelText('chat.threadRevisionCap')).toHaveValue(0.5);
    await userEvent.click(screen.getByRole('button', { name: 'common.cancel' }));
    expect(detail.setEditingRevision).toHaveBeenCalledWith(false);
  });

  it('keeps the suggestion being applied by hand beside the editor, and lets the owner hide it', async () => {
    const dismissEditorSuggestion = vi.fn();
    const detail = makeDetail(
      {
        hasDraft: true,
        editingRevision: true,
        revisionMarkdown: 'Body',
        revisionCapUsd: '0.5',
        editorSuggestion: { id: 'cr-1', suggestion: 'Add a conclusion' },
        dismissEditorSuggestion,
      },
      readyGeneration(),
    );
    render(<ThreadPublicationDetail detail={detail} />);

    const card = screen.getByTestId('thread-editor-suggestion');
    expect(card).toHaveTextContent('Add a conclusion');
    await userEvent.click(
      within(card).getByRole('button', { name: 'threadReview.editorSuggestionDismiss' }),
    );
    expect(dismissEditorSuggestion).toHaveBeenCalledOnce();
  });

  it('shows no suggestion card when the editor was opened without one', () => {
    const detail = makeDetail(
      { hasDraft: true, editingRevision: true, revisionMarkdown: 'Body', editorSuggestion: null },
      readyGeneration(),
    );
    render(<ThreadPublicationDetail detail={detail} />);

    expect(screen.queryByTestId('thread-editor-suggestion')).toBeNull();
  });

  it('says the job is queued, never "freezing your chat", before it starts', () => {
    const detail = makeDetail(
      { generationFailed: false },
      {
        data: {
          publicationId: 'pub-1',
          publicationStatus: 'DRAFT',
          jobId: 'job-1',
          status: 'QUEUED',
          stage: 'SNAPSHOT',
          round: 0,
          safeErrorCode: null,
          draft: null,
        },
      },
    );
    render(<ThreadPublicationDetail detail={detail} />);

    expect(screen.getByTestId('thread-generation-stage')).toHaveTextContent(
      'chat.threadProgress.statusQueued',
    );
    expect(screen.getByTestId('thread-generation-stage')).not.toHaveTextContent(
      'chat.threadStageSnapshot',
    );
  });
});
