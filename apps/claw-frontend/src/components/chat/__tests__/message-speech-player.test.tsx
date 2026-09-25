import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MessageSpeechAction } from '@/components/chat/message-speech-action';
import { MessageSpeechPlayer } from '@/components/chat/message-speech-player';
import { ApiClientError } from '@/services/shared/api-client';

const mockGetAvailability = vi.fn();
const mockSynthesize = vi.fn();
const mockBlob = vi.fn();
const mockDownload = vi.fn();

vi.mock('@/repositories/chat/message-speech.repository', () => ({
  messageSpeechRepository: {
    getAvailability: (...args: unknown[]) => mockGetAvailability(...args),
    synthesize: (...args: unknown[]) => mockSynthesize(...args),
  },
}));
vi.mock('@/hooks/chat/use-authenticated-file-blob', () => ({
  useAuthenticatedFileBlob: (...args: unknown[]) => mockBlob(...args),
}));
vi.mock('@/utilities/download-blob.utility', () => ({
  triggerBrowserDownload: (...args: unknown[]) => mockDownload(...args),
}));
vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ locale: 'en', t: (key: string) => key }),
}));

function speech(truncated: boolean): Record<string, unknown> {
  return {
    fileId: 'file-1',
    mimeType: 'audio/wav',
    filename: 'reply.wav',
    truncated,
    characters: 4000,
    cached: false,
  };
}

// The player reads the request the button started, so the two render together
// exactly as they do in a bubble.
async function renderAndPress(): Promise<void> {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MessageSpeechAction messageId="msg-1" />
      <MessageSpeechPlayer messageId="msg-1" />
    </QueryClientProvider>,
  );
  await waitFor(() => expect(mockGetAvailability).toHaveBeenCalled());
  fireEvent.click(screen.getByRole('button', { name: 'chat.speech.action' }));
}

describe('MessageSpeechPlayer', () => {
  beforeEach(() => {
    mockGetAvailability.mockReset().mockResolvedValue({ available: true, reason: null });
    mockSynthesize.mockReset();
    mockDownload.mockReset();
    mockBlob.mockReset().mockReturnValue({
      blobUrl: 'blob:speech-1',
      isLoading: false,
      error: null,
      load: vi.fn(),
    });
  });

  it('renders nothing until read aloud is pressed', () => {
    const client = new QueryClient();
    render(
      <QueryClientProvider client={client}>
        <MessageSpeechPlayer messageId="msg-1" />
      </QueryClientProvider>,
    );

    expect(screen.queryByTestId('message-speech-player')).not.toBeInTheDocument();
  });

  it('plays the authenticated file after success and downloads it by name', async () => {
    mockSynthesize.mockResolvedValue(speech(false));
    await renderAndPress();

    const audio = await screen.findByTestId('message-speech-audio');
    expect(audio).toHaveAttribute('src', 'blob:speech-1');
    expect(audio).toHaveAttribute('controlsList', 'nodownload');
    expect(audio.querySelector('track[kind="captions"]')).not.toBeNull();
    expect(mockBlob).toHaveBeenCalledWith('/api/v1/files/download/file-1', true);
    expect(screen.queryByTestId('message-speech-truncated')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('message-speech-download'));

    expect(mockDownload).toHaveBeenCalledWith('blob:speech-1', 'reply.wav', 'audio/wav');
  });

  it('says in visible text when only the first part was read', async () => {
    mockSynthesize.mockResolvedValue(speech(true));
    await renderAndPress();

    const note = await screen.findByText('chat.speech.truncated');
    expect(note).toBeVisible();
  });

  it('closes when the button is pressed again', async () => {
    mockSynthesize.mockResolvedValue(speech(false));
    await renderAndPress();
    await screen.findByTestId('message-speech-audio');

    fireEvent.click(screen.getByRole('button', { name: 'chat.speech.stop' }));

    await waitFor(() =>
      expect(screen.queryByTestId('message-speech-player')).not.toBeInTheDocument(),
    );
  });

  it.each([
    ['PAYG_CREDIT_EXHAUSTED', 402, 'billing.errors.PAYG_CREDIT_EXHAUSTED'],
    ['TTS_UNAVAILABLE', 503, 'chat.speech.errors.unavailable'],
  ])('shows the localized error for %s', async (code, status, key) => {
    mockSynthesize.mockRejectedValue(new ApiClientError({ message: 'refused', status, code }));
    await renderAndPress();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(key);
    expect(screen.queryByTestId('message-speech-audio')).not.toBeInTheDocument();
  });

  it('says so when the audio file itself cannot be loaded', async () => {
    mockSynthesize.mockResolvedValue(speech(false));
    mockBlob.mockReturnValue({
      blobUrl: null,
      isLoading: false,
      error: new Error('403'),
      load: vi.fn(),
    });
    await renderAndPress();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('chat.speech.errors.playback');
    expect(screen.getByTestId('message-speech-download')).toBeDisabled();
  });
});
