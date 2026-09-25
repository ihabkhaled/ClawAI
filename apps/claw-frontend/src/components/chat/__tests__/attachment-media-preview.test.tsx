import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
      posterSrc: null,
      durationLabel: null,
      posterAlt: '',
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
      posterSrc: null,
      durationLabel: null,
      posterAlt: '',
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
      posterSrc: null,
      durationLabel: null,
      posterAlt: '',
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
      posterSrc: null,
      durationLabel: null,
      posterAlt: '',
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
      posterSrc: null,
      durationLabel: null,
      posterAlt: '',
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
      posterSrc: null,
      durationLabel: null,
      posterAlt: '',
      play: vi.fn(),
    });

    render(
      <AttachmentMediaPreview fileId="f1" filename="note.mp3" kind={AttachmentPreviewKind.Audio} />,
    );

    expect(screen.getByText('chat.attachment.previewFailed')).toBeInTheDocument();
  });

  // The player's own download menu saved a nameless "blob" with no extension
  // (reported 2026-09-25). It is hidden, and an explicit button saves the
  // stored filename.
  it('hides the native nameless download and offers a named Download button', async () => {
    const download = vi.fn();
    mockUseAttachmentMediaPreview.mockReturnValue({
      t,
      blobUrl: 'blob:mock-audio',
      isLoading: false,
      error: null,
      hasStarted: true,
      posterSrc: null,
      durationLabel: null,
      posterAlt: '',
      play: vi.fn(),
      download,
    });

    render(
      <AttachmentMediaPreview
        fileId="f1"
        filename="voice-note.webm"
        mimeType="audio/webm"
        kind={AttachmentPreviewKind.Audio}
      />,
    );

    expect(screen.getByTestId('attachment-audio-player')).toHaveAttribute(
      'controlslist',
      'nodownload',
    );
    await userEvent.click(screen.getByTestId('attachment-media-download'));
    expect(download).toHaveBeenCalledOnce();
    expect(mockUseAttachmentMediaPreview).toHaveBeenLastCalledWith(
      'f1',
      'voice-note.webm',
      'audio/webm',
      undefined,
    );
  });

  it('shows a processed video thumbnail and length before playback, with Play over it', () => {
    mockUseAttachmentMediaPreview.mockReturnValue({
      t,
      blobUrl: null,
      isLoading: false,
      error: null,
      hasStarted: false,
      posterSrc: 'data:image/jpeg;base64,dGh1bWI=',
      durationLabel: 'mediaUi.video.duration',
      posterAlt: 'mediaUi.video.thumbnailAlt',
      play: vi.fn(),
      download: vi.fn(),
    });
    const media = { durationMs: 42_000, thumbnailBase64: 'dGh1bWI=' };

    render(
      <AttachmentMediaPreview
        fileId="f1"
        filename="clip.mp4"
        kind={AttachmentPreviewKind.Video}
        media={media}
      />,
    );

    const poster = screen.getByTestId('attachment-video-poster');
    expect(poster).toHaveAttribute('src', 'data:image/jpeg;base64,dGh1bWI=');
    expect(poster).toHaveAttribute('alt', 'mediaUi.video.thumbnailAlt');
    expect(screen.getByTestId('attachment-video-duration')).toHaveTextContent(
      'mediaUi.video.duration',
    );
    expect(screen.getByRole('button', { name: 'chat.attachment.play' })).toBeInTheDocument();
    expect(screen.queryByTestId('attachment-media-preview')).not.toBeInTheDocument();
    expect(mockUseAttachmentMediaPreview).toHaveBeenLastCalledWith(
      'f1',
      'clip.mp4',
      undefined,
      media,
    );
  });

  it('falls back to the plain play card when a video has no thumbnail', () => {
    mockUseAttachmentMediaPreview.mockReturnValue({
      t,
      blobUrl: null,
      isLoading: false,
      error: null,
      hasStarted: false,
      posterSrc: null,
      durationLabel: null,
      posterAlt: '',
      play: vi.fn(),
      download: vi.fn(),
    });

    render(
      <AttachmentMediaPreview fileId="f1" filename="clip.mp4" kind={AttachmentPreviewKind.Video} />,
    );

    expect(screen.queryByTestId('attachment-video-thumbnail')).not.toBeInTheDocument();
    expect(screen.getByTestId('attachment-media-preview')).toBeInTheDocument();
  });
});
