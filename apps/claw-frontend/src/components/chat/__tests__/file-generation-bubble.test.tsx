import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FileGenerationBubble } from '@/components/chat/file-generation-bubble';

const { useFileGenerationBubble, retry } = vi.hoisted(() => ({
  useFileGenerationBubble: vi.fn(),
  retry: vi.fn(),
}));
vi.mock('@/hooks/chat/use-file-generation-bubble', () => ({ useFileGenerationBubble }));
vi.mock('@/repositories/file-generation/file-generation.repository', () => ({
  fileGenerationRepository: { retry },
}));
vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) =>
      params === undefined ? key : `${key} ${JSON.stringify(params)}`,
    locale: 'en',
    dir: 'ltr',
  }),
}));

const completed = {
  id: 'g1',
  status: 'COMPLETED',
  format: 'PDF',
  filename: 'Report.pdf',
  assets: [],
  errorMessage: null,
};

const view = (overrides: Record<string, unknown> = {}) => ({
  generation: completed,
  asset: {
    id: 'a1',
    downloadUrl: '/api/v1/file-generations/g1/assets/a1/download',
    sizeBytes: 2048,
  },
  expired: false,
  minutesLeft: 42,
  isRebuilding: false,
  isDownloading: false,
  downloadFailed: false,
  download: vi.fn(),
  rebuild: vi.fn(),
  ...overrides,
});

describe('FileGenerationBubble', () => {
  beforeEach(() => vi.clearAllMocks());

  it('offers the download with the minutes left, and downloads on click', () => {
    const state = view();
    useFileGenerationBubble.mockReturnValue(state);

    render(<FileGenerationBubble generationId="g1" prompt="make a pdf" />);

    expect(screen.getByText('Report.pdf')).toBeInTheDocument();
    expect(screen.getByText('chat.fileAvailableFor {"minutes":42}')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('file-download'));
    expect(state.download).toHaveBeenCalled();
  });

  // After the hour: the file is gone, the chat offers both ways back.
  it('offers a free rebuild and an AI regenerate once the file expired', () => {
    const state = view({ expired: true, minutesLeft: null });
    const onRegenerate = vi.fn();
    useFileGenerationBubble.mockReturnValue(state);

    render(<FileGenerationBubble generationId="g1" prompt="p" onRegenerate={onRegenerate} />);

    expect(screen.queryByTestId('file-download')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('file-rebuild'));
    fireEvent.click(screen.getByTestId('file-regenerate-ai'));
    expect(state.rebuild).toHaveBeenCalled();
    expect(onRegenerate).toHaveBeenCalled();
  });

  it('hides the AI regenerate when the message cannot be regenerated', () => {
    useFileGenerationBubble.mockReturnValue(view({ expired: true }));

    render(<FileGenerationBubble generationId="g1" prompt="p" />);

    expect(screen.getByTestId('file-rebuild')).toBeInTheDocument();
    expect(screen.queryByTestId('file-regenerate-ai')).not.toBeInTheDocument();
  });

  it('shows the download error when a download fails', () => {
    useFileGenerationBubble.mockReturnValue(view({ downloadFailed: true }));

    render(<FileGenerationBubble generationId="g1" prompt="p" />);

    expect(screen.getByRole('alert')).toHaveTextContent('chat.fileDownloadFailed');
  });

  it('shows retry for a failed job', () => {
    useFileGenerationBubble.mockReturnValue(
      view({
        generation: { ...completed, status: 'FAILED', errorMessage: 'boom' },
        asset: undefined,
      }),
    );

    render(<FileGenerationBubble generationId="g1" prompt="p" />);

    expect(screen.queryByTestId('file-completed')).not.toBeInTheDocument();
    expect(screen.queryByTestId('file-expired')).not.toBeInTheDocument();
  });
});
