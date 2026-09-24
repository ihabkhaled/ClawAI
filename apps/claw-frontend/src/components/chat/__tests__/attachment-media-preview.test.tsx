import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AttachmentMediaPreview } from '@/components/chat/attachment-media-preview';
import { AttachmentPreviewKind } from '@/enums/attachment-preview-kind.enum';

const mockUseAttachmentMediaPreview = vi.fn();

vi.mock('@/hooks/chat/use-attachment-media-preview', () => ({
  useAttachmentMediaPreview: (...args: unknown[]) => mockUseAttachmentMediaPreview(...args),
}));

const t = (key: string): string => key;

describe('AttachmentMediaPreview', () => {
  it('shows a Play button labelled as a voice note before playback starts', () => {
    const play = vi.fn();
    mockUseAttachmentMediaPreview.mockReturnValue({
      t,
      blobUrl: null,
      isLoading: false,
      error: null,
      hasStarted: false,
      play,
    });

    render(
      <AttachmentMediaPreview fileId="f1" filename="note.mp3" kind={AttachmentPreviewKind.Audio} />,
    );

    expect(screen.getByText('chat.attachment.voiceNote')).toBeInTheDocument();
    expect(screen.queryByTestId('attachment-audio-player')).not.toBeInTheDocument();
  });

  it('shows a Play button labelled as a video note before playback starts', () => {
    mockUseAttachmentMediaPreview.mockReturnValue({
      t,
      blobUrl: null,
      isLoading: false,
      error: null,
      hasStarted: false,
      play: vi.fn(),
    });

    render(
      <AttachmentMediaPreview fileId="f1" filename="clip.mp4" kind={AttachmentPreviewKind.Video} />,
    );

    expect(screen.getByText('chat.attachment.videoNote')).toBeInTheDocument();
  });

  it('renders a working inline <audio> player once the blob has loaded', () => {
    mockUseAttachmentMediaPreview.mockReturnValue({
      t,
      blobUrl: 'blob:mock-audio',
      isLoading: false,
      error: null,
      hasStarted: true,
      play: vi.fn(),
    });

    render(
      <AttachmentMediaPreview fileId="f1" filename="note.mp3" kind={AttachmentPreviewKind.Audio} />,
    );

    const player = screen.getByTestId('attachment-audio-player');
    expect(player).toBeInTheDocument();
    expect(player.tagName).toBe('AUDIO');
    expect(player).toHaveAttribute('src', 'blob:mock-audio');
    expect(player).toHaveAttribute('controls');
  });

  it('renders a working inline <video> player once the blob has loaded', () => {
    mockUseAttachmentMediaPreview.mockReturnValue({
      t,
      blobUrl: 'blob:mock-video',
      isLoading: false,
      error: null,
      hasStarted: true,
      play: vi.fn(),
    });

    render(
      <AttachmentMediaPreview fileId="f1" filename="clip.mp4" kind={AttachmentPreviewKind.Video} />,
    );

    const player = screen.getByTestId('attachment-video-player');
    expect(player.tagName).toBe('VIDEO');
    expect(player).toHaveAttribute('src', 'blob:mock-video');
    expect(player).toHaveAttribute('controls');
  });

  it('shows a loading state while the blob is being fetched', () => {
    mockUseAttachmentMediaPreview.mockReturnValue({
      t,
      blobUrl: null,
      isLoading: true,
      error: null,
      hasStarted: true,
      play: vi.fn(),
    });

    render(
      <AttachmentMediaPreview fileId="f1" filename="note.mp3" kind={AttachmentPreviewKind.Audio} />,
    );

    expect(screen.getByText('chat.attachment.loading')).toBeInTheDocument();
  });

  it('shows a real error message rather than a broken placeholder when the fetch fails', () => {
    mockUseAttachmentMediaPreview.mockReturnValue({
      t,
      blobUrl: null,
      isLoading: false,
      error: new Error('boom'),
      hasStarted: false,
      play: vi.fn(),
    });

    render(
      <AttachmentMediaPreview fileId="f1" filename="note.mp3" kind={AttachmentPreviewKind.Audio} />,
    );

    expect(screen.getByText('chat.attachment.previewFailed')).toBeInTheDocument();
  });
});
