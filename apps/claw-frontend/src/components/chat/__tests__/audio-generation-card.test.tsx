import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AudioGenerationCard } from '@/components/chat/audio-generation-card';
import { AudioGenerationStatus } from '@/enums/audio-generation-status.enum';
import { en } from '@/lib/i18n/locales/en';
import type { AudioGenerationRow } from '@/types/media-generation.types';

const { mockState, mockBlob } = vi.hoisted(() => ({ mockState: vi.fn(), mockBlob: vi.fn() }));

vi.mock('@/hooks/chat/use-audio-generation-state', () => ({
  useAudioGenerationState: () => mockState(),
}));
vi.mock('@/hooks/chat/use-authenticated-video', () => ({
  useAuthenticatedVideo: (path: string | undefined) => mockBlob(path),
}));

// A translator over the REAL English dictionary: a missing key fails the assertions below.
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

const row = (overrides: Partial<AudioGenerationRow> = {}): AudioGenerationRow => ({
  id: 'aud-1',
  status: AudioGenerationStatus.RUNNING,
  provider: 'GEMINI',
  model: 'gemini-tts',
  kind: 'SPEECH',
  supersededById: null,
  asset: null,
  ...overrides,
});

const handleRetry = vi.fn();
const setState = (generation: AudioGenerationRow | null, isStatusUnknown = false): void => {
  mockState.mockReturnValue({ generation, isStatusUnknown, handleRetry });
};
const renderCard = (): void => {
  render(<AudioGenerationCard generationId="aud-1" prompt="say hi" />);
};

describe('AudioGenerationCard', () => {
  beforeEach(() => {
    handleRetry.mockClear();
    mockBlob.mockReturnValue({ blobUrl: null, failed: false });
  });

  it('shows the preparing line before the first read', () => {
    setState(null);
    renderCard();
    expect(screen.getByRole('status').textContent).toContain('Preparing audio');
  });

  it('shows the running line with the prompt', () => {
    setState(row());
    renderCard();
    expect(screen.getByRole('status').textContent).toContain('Generating audio');
    expect(screen.getByText('say hi')).toBeTruthy();
  });

  it('plays a completed clip with a labelled player, download and length', () => {
    mockBlob.mockReturnValue({ blobUrl: 'blob:x', failed: false });
    setState(
      row({
        status: AudioGenerationStatus.COMPLETED,
        durationSec: 65,
        mimeType: 'audio/wav',
        asset: {
          id: 'f',
          url: '/files/view/f',
          downloadUrl: '/files/download/f',
          mimeType: 'audio/wav',
          sizeBytes: 9,
        },
      }),
    );
    renderCard();
    expect(mockBlob).toHaveBeenCalledWith('/files/download/f');
    const player = screen.getByTestId('audio-generation-player');
    expect(player.getAttribute('src')).toBe('blob:x');
    expect(player.getAttribute('aria-label')).toBe('Generated audio: say hi');
    expect(screen.getByText('Download').closest('a')?.getAttribute('download')).toBe(
      'claw-audio.wav',
    );
    expect(screen.getByText('Length 1:05')).toBeTruthy();
  });

  it('shows the error text and retries on a failure', () => {
    setState(row({ status: AudioGenerationStatus.FAILED, errorMessage: 'Provider refused' }));
    renderCard();
    expect(screen.getByTestId('audio-generation-error').textContent).toContain('Provider refused');
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(handleRetry).toHaveBeenCalledTimes(1);
  });

  it('says timed out and offers retry', () => {
    setState(row({ status: AudioGenerationStatus.TIMED_OUT }));
    renderCard();
    expect(screen.getByText('Audio generation timed out')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy();
  });

  it('offers retry on a cancelled clip', () => {
    setState(row({ status: AudioGenerationStatus.CANCELLED }));
    renderCard();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy();
  });

  it('says so when the file cannot be loaded', () => {
    mockBlob.mockReturnValue({ blobUrl: null, failed: true });
    setState(row({ status: AudioGenerationStatus.COMPLETED, assetUrl: '/files/download/f' }));
    renderCard();
    expect(screen.getByText('Could not load the audio')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull();
  });

  it('says so when polling gave up', () => {
    setState(row(), true);
    renderCard();
    expect(screen.getByRole('alert').textContent).toContain('We stopped checking this audio');
  });
});
