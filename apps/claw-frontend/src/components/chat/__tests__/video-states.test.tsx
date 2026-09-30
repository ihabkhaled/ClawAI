import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { VideoCancelledState } from '@/components/chat/video-cancelled-state';
import { VideoCompletedState } from '@/components/chat/video-completed-state';
import { VideoErrorState } from '@/components/chat/video-error-state';
import { VideoLoadingState } from '@/components/chat/video-loading-state';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key, locale: 'en', dir: 'ltr' }),
}));

describe('VideoLoadingState', () => {
  it('announces the stage politely, names provider/model and shows the wait note', () => {
    render(
      <VideoLoadingState
        stageText="Generating video"
        prompt="a fox"
        provider="VIDEO_GEMINI"
        model="veo-3.1"
        note="Video can take a few minutes"
      />,
    );

    const live = screen.getByRole('status');
    expect(live).toHaveAttribute('aria-live', 'polite');
    expect(live).toHaveTextContent('Generating video');
    expect(screen.getByText('VIDEO_GEMINI / veo-3.1')).toBeVisible();
    expect(screen.getByText('Video can take a few minutes')).toBeVisible();
    expect(screen.queryByTestId('video-generation-cancel')).toBeNull();
  });

  it('renders an accessible Cancel button that calls the handler, and disables it while cancelling', () => {
    const onCancel = vi.fn();
    const { rerender } = render(
      <VideoLoadingState
        stageText="Queued"
        prompt="a fox"
        onCancel={onCancel}
        cancelLabel="Cancel"
        cancelAriaLabel="Cancel video generation"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Cancel video generation' }));
    expect(onCancel).toHaveBeenCalledTimes(1);

    rerender(
      <VideoLoadingState
        stageText="Queued"
        prompt="a fox"
        onCancel={onCancel}
        cancelLabel="Cancelling…"
        cancelAriaLabel="Cancel video generation"
        isCancelling
      />,
    );
    const button = screen.getByTestId('video-generation-cancel');
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
  });

  it('never forces a width wider than the screen', () => {
    const { container } = render(<VideoLoadingState stageText="Queued" prompt="a fox" />);
    expect(container.firstElementChild).toHaveClass('w-full', 'max-w-full');
  });
});

describe('VideoCompletedState', () => {
  it('plays the blob URL with native controls and inline playback', () => {
    render(<VideoCompletedState blobUrl="blob:clip" prompt="a fox" />);

    const player = screen.getByLabelText('a fox');
    expect(player.tagName).toBe('VIDEO');
    expect(player).toHaveAttribute('src', 'blob:clip');
    expect(player).toHaveAttribute('controls');
    expect(player).toHaveAttribute('preload', 'metadata');
    expect(player).toHaveProperty('playsInline', true);
  });

  it('offers a Download link (claw-video.mp4) and an Open link, both labelled', () => {
    render(<VideoCompletedState blobUrl="blob:clip" prompt="a fox" />);

    const download = screen.getByRole('link', { name: 'common.download' });
    expect(download).toHaveAttribute('href', 'blob:clip');
    expect(download).toHaveAttribute('download', 'claw-video.mp4');
    const open = screen.getByRole('link', { name: 'chat.open' });
    expect(open).toHaveAttribute('href', 'blob:clip');
    expect(open).toHaveAttribute('target', '_blank');
    expect(open).toHaveAttribute('rel', 'noreferrer');
  });
});

describe('VideoErrorState', () => {
  it('shows the provider message when there is one, with Retry', () => {
    const onRetry = vi.fn();
    render(
      <VideoErrorState
        status="Generation failed"
        error="Provider refused the prompt"
        provider="VIDEO_GROK"
        model="grok-imagine-video"
        onRetry={onRetry}
      />,
    );

    expect(screen.getByText('Generation failed')).toBeVisible();
    expect(screen.getByText(/Provider refused the prompt/u)).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'common.retry' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('falls back to the translated generic message', () => {
    render(<VideoErrorState status="Generation failed" error={null} onRetry={vi.fn()} />);
    expect(screen.getByText('chat.videoGenerationFailedRetry')).toBeVisible();
  });

  it('renders no Retry button when retrying cannot help', () => {
    render(<VideoErrorState status="Could not load" error="Reload" />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});

describe('VideoCancelledState', () => {
  it('says it was cancelled and offers Retry', () => {
    const onRetry = vi.fn();
    render(
      <VideoCancelledState label="Generation cancelled" retryLabel="Retry" onRetry={onRetry} />,
    );

    expect(screen.getByRole('status')).toHaveTextContent('Generation cancelled');
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
