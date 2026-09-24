import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { AttachmentFilePreview } from '@/components/chat/attachment-file-preview';
import { AttachmentPreviewKind } from '@/enums/attachment-preview-kind.enum';

const mockUseAttachmentFilePreview = vi.fn();

vi.mock('@/hooks/chat/use-attachment-file-preview', () => ({
  useAttachmentFilePreview: (...args: unknown[]) => mockUseAttachmentFilePreview(...args),
}));

const t = (key: string): string => key;

function baseHookState(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    t,
    isLoading: false,
    error: null,
    previewText: null,
    isPreviewTruncated: false,
    view: vi.fn(),
    download: vi.fn(),
    ...overrides,
  };
}

describe('AttachmentFilePreview', () => {
  it('shows the correct icon + filename for a PDF, with a View action (native viewer)', () => {
    mockUseAttachmentFilePreview.mockReturnValue(baseHookState());

    render(
      <AttachmentFilePreview
        fileId="f1"
        filename="report.pdf"
        mimeType="application/pdf"
        kind={AttachmentPreviewKind.Pdf}
      />,
    );

    expect(screen.getByText('report.pdf')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /chat\.attachment\.view/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /chat\.attachment\.download/ })).toBeInTheDocument();
  });

  it('calls view() when the PDF View button is clicked (opens the native viewer)', async () => {
    const view = vi.fn();
    mockUseAttachmentFilePreview.mockReturnValue(baseHookState({ view }));
    const user = userEvent.setup();

    render(
      <AttachmentFilePreview
        fileId="f1"
        filename="report.pdf"
        mimeType="application/pdf"
        kind={AttachmentPreviewKind.Pdf}
      />,
    );
    await user.click(screen.getByRole('button', { name: /chat\.attachment\.view/ }));

    expect(view).toHaveBeenCalledTimes(1);
  });

  it('shows a truncated readable preview for a text-like file', () => {
    mockUseAttachmentFilePreview.mockReturnValue(
      baseHookState({ previewText: 'hello world', isPreviewTruncated: true }),
    );

    render(
      <AttachmentFilePreview
        fileId="f1"
        filename="notes.txt"
        mimeType="text/plain"
        kind={AttachmentPreviewKind.Text}
      />,
    );

    expect(screen.getByTestId('attachment-text-preview')).toHaveTextContent('hello world');
    expect(screen.getByText('chat.attachment.previewTruncated')).toBeInTheDocument();
  });

  it('a generic file (docx — no in-app viewer) shows only Download, never a View button', () => {
    mockUseAttachmentFilePreview.mockReturnValue(baseHookState());

    render(
      <AttachmentFilePreview
        fileId="f1"
        filename="plan.docx"
        mimeType="application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        kind={AttachmentPreviewKind.Generic}
      />,
    );

    expect(screen.getByText('plan.docx')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /chat\.attachment\.download/ })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /chat\.attachment\.view/ }),
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId('attachment-text-preview')).not.toBeInTheDocument();
  });

  it('calls download() when Download is clicked', async () => {
    const download = vi.fn();
    mockUseAttachmentFilePreview.mockReturnValue(baseHookState({ download }));
    const user = userEvent.setup();

    render(
      <AttachmentFilePreview
        fileId="f1"
        filename="plan.docx"
        mimeType="application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        kind={AttachmentPreviewKind.Generic}
      />,
    );
    await user.click(screen.getByRole('button', { name: /chat\.attachment\.download/ }));

    expect(download).toHaveBeenCalledTimes(1);
  });

  it('shows a real error message rather than a broken placeholder when the fetch fails', () => {
    mockUseAttachmentFilePreview.mockReturnValue(baseHookState({ error: new Error('boom') }));

    render(
      <AttachmentFilePreview
        fileId="f1"
        filename="archive.7z"
        mimeType="application/x-7z-compressed"
        kind={AttachmentPreviewKind.Generic}
      />,
    );

    expect(screen.getByText('chat.attachment.previewFailed')).toBeInTheDocument();
  });
});
