import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { VideoGenerationBubble } from '@/components/chat/video-generation-bubble';
import { VideoGenerationStatus } from '@/enums/video-generation-status.enum';
import { en } from '@/lib/i18n/locales/en';
import type { VideoGeneration } from '@/types/video-generation.types';

const { mockState, mockVideo } = vi.hoisted(() => ({
  mockState: vi.fn(),
  mockVideo: vi.fn(),
}));

vi.mock('@/hooks/chat/use-video-generation-bubble-state', () => ({
  useVideoGenerationBubbleState: () => mockState(),
}));
vi.mock('@/hooks/chat/use-authenticated-video', () => ({
  useAuthenticatedVideo: (path: string | undefined) => mockVideo(path),
}));

// A translator over the REAL English dictionary: a key that does not exist
// would render the raw key and fail the assertions below.
function translate(key: string): string {
  let node: unknown = en;
  for (const part of key.split('.')) {
    node = typeof node === 'object' && node !== null ? Reflect.get(node, part) : undefined;
  }
  return typeof node === 'string' ? node : `MISSING:${key}`;
}
vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: translate, locale: 'en', dir: 'ltr' }),
}));

const generation = (overrides: Partial<VideoGeneration> = {}): VideoGeneration => ({
  id: 'vid-1',
  status: VideoGenerationStatus.GENERATING,
  provider: 'VIDEO_GEMINI',
  model: 'veo-3.1-fast-generate-preview',
  prompt: 'a fox',
  durationSeconds: 4,
  aspectRatio: '16:9',
  errorCode: null,
  errorMessage: null,
  createdAt: '2026-09-30T00:00:00Z',
  completedAt: null,
  supersededById: null,
  isAutoMode: true,
  asset: null,
  ...overrides,
});

const asset = {
  id: 'a1',
  url: '/api/v1/files/view/f1',
  downloadUrl: '/api/v1/files/download/f1',
  mimeType: 'video/mp4',
  sizeBytes: 1024,
};

const handlers = { handleRetry: vi.fn(), handleCancel: vi.fn() };

const setState = (gen: VideoGeneration | null, extra: Record<string, unknown> = {}): void => {
  mockState.mockReturnValue({
    generation: gen,
    canCancel: gen?.status === VideoGenerationStatus.GENERATING,
    isCancelling: false,
    ...handlers,
    ...extra,
  });
};

describe('VideoGenerationBubble', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVideo.mockReturnValue({ blobUrl: null, failed: false });
  });

  it('shows the preparing stage before the first read answers, with the wait note and no Cancel', () => {
    setState(null);
    render(<VideoGenerationBubble generationId="vid-1" prompt="a fox" />);

    expect(screen.getByRole('status')).toHaveTextContent('Preparing video');
    expect(screen.getByText(en.chat.videoTakesMinutes)).toBeVisible();
    expect(screen.queryByTestId('video-generation-cancel')).toBeNull();
  });

  it('says so when polling gave up, instead of spinning on "Generating video" forever', () => {
    setState(generation(), { isStatusUnknown: true });
    render(<VideoGenerationBubble generationId="vid-1" prompt="a fox" />);

    expect(screen.getByTestId('video-generation-error')).toHaveTextContent(
      en.chat.videoStatusUnknown,
    );
    expect(screen.getByTestId('video-generation-error')).toHaveTextContent(
      en.chat.videoStatusUnknownHint,
    );
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('shows the stage, provider/model and a working Cancel while generating', () => {
    setState(generation());
    render(<VideoGenerationBubble generationId="vid-1" prompt="a fox" />);

    expect(screen.getByRole('status')).toHaveTextContent('Generating video');
    expect(screen.getByText('VIDEO_GEMINI / veo-3.1-fast-generate-preview')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: en.chat.videoCancelAria }));
    expect(handlers.handleCancel).toHaveBeenCalledTimes(1);
    expect(mockVideo).toHaveBeenLastCalledWith(undefined);
  });

  it('plays the completed clip and fetches the authenticated download URL', () => {
    setState(generation({ status: VideoGenerationStatus.COMPLETED, asset }));
    mockVideo.mockReturnValue({ blobUrl: 'blob:clip', failed: false });
    render(<VideoGenerationBubble generationId="vid-1" prompt="a fox" />);

    expect(mockVideo).toHaveBeenLastCalledWith('/api/v1/files/download/f1');
    expect(screen.getByLabelText('a fox')).toHaveAttribute('src', 'blob:clip');
    expect(screen.getByRole('link', { name: en.common.download })).toHaveAttribute(
      'download',
      'claw-video.mp4',
    );
  });

  it('shows a loading line while a completed clip is still downloading', () => {
    setState(generation({ status: VideoGenerationStatus.COMPLETED, asset }));
    render(<VideoGenerationBubble generationId="vid-1" prompt="a fox" />);

    expect(screen.getByRole('status')).toHaveTextContent(en.chat.loadingVideo);
    expect(screen.queryByTestId('video-generation-player')).toBeNull();
  });

  it('explains a completed clip that cannot be loaded, with no Retry that would spend money', () => {
    setState(generation({ status: VideoGenerationStatus.COMPLETED, asset }));
    mockVideo.mockReturnValue({ blobUrl: null, failed: true });
    render(<VideoGenerationBubble generationId="vid-1" prompt="a fox" />);

    expect(screen.getByText(en.chat.videoLoadFailed)).toBeVisible();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('shows the error message and Retry on FAILED', () => {
    setState(generation({ status: VideoGenerationStatus.FAILED, errorMessage: 'Quota hit' }));
    render(<VideoGenerationBubble generationId="vid-1" prompt="a fox" />);

    expect(screen.getByText('Generation failed')).toBeVisible();
    expect(screen.getByText(/Quota hit/u)).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: en.common.retry }));
    expect(handlers.handleRetry).toHaveBeenCalledTimes(1);
  });

  it('uses the translated generic message on TIMED_OUT without a provider message', () => {
    setState(generation({ status: VideoGenerationStatus.TIMED_OUT }));
    render(<VideoGenerationBubble generationId="vid-1" prompt="a fox" />);

    expect(screen.getByText('Generation timed out')).toBeVisible();
    expect(screen.getByText(en.chat.videoGenerationFailedRetry)).toBeVisible();
  });

  it('shows the cancelled card with Retry', () => {
    setState(generation({ status: VideoGenerationStatus.CANCELLED }));
    render(<VideoGenerationBubble generationId="vid-1" prompt="a fox" />);

    expect(screen.getByTestId('video-generation-cancelled')).toHaveTextContent(
      en.chat.generationCancelled,
    );
    fireEvent.click(screen.getByRole('button', { name: en.common.retry }));
    expect(handlers.handleRetry).toHaveBeenCalledTimes(1);
  });
});
