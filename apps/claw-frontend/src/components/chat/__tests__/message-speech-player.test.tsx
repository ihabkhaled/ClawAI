import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MessageSpeechAction } from '@/components/chat/message-speech-action';
import { MessageSpeechPlayer } from '@/components/chat/message-speech-player';
import { ApiClientError } from '@/services/shared/api-client';

const mockGetAvailability = vi.fn();
const mockStart = vi.fn();
const mockGetState = vi.fn();
const mockGetSegmentAudio = vi.fn();

vi.mock('@/repositories/chat/message-speech.repository', () => ({
  messageSpeechRepository: {
    getAvailability: (...args: unknown[]) => mockGetAvailability(...args),
    start: (...args: unknown[]) => mockStart(...args),
    getState: (...args: unknown[]) => mockGetState(...args),
    getSegmentAudio: (...args: unknown[]) => mockGetSegmentAudio(...args),
  },
}));
vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    locale: 'en',
    t: (key: string, params?: Record<string, number>) =>
      params === undefined ? key : `${key}:${String(params['current'])}/${String(params['total'])}`,
  }),
}));

type Segment = { index: number; fileId: string; mimeType: string; characters: number };

function segment(index: number): Segment {
  return { index, fileId: `file-${String(index)}`, mimeType: 'audio/wav', characters: 100 };
}

function speechState(
  status: string,
  indices: number[],
  extra: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    status,
    segments: indices.map(segment),
    totalSegments: 3,
    truncated: false,
    errorCode: null,
    ...extra,
  };
}

const createObjectURL = vi.fn((blob: Blob) => `blob:${String(blob.size)}-${String(Math.random())}`);
const revokeObjectURL = vi.fn();

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

function audioSrc(): string | null {
  return screen.queryByTestId('message-speech-audio')?.getAttribute('src') ?? null;
}

describe('MessageSpeechPlayer (progressive)', () => {
  beforeEach(() => {
    mockGetAvailability.mockReset().mockResolvedValue({ available: true, reason: null });
    mockStart.mockReset();
    mockGetState.mockReset();
    mockGetSegmentAudio
      .mockReset()
      .mockImplementation(async (fileId: string) => new Blob([fileId]));
    createObjectURL.mockClear();
    revokeObjectURL.mockClear();
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL, revokeObjectURL }));
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
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

  it('replays a READY reading: plays the parts in order, preloads the next, never polls', async () => {
    mockStart.mockResolvedValue(speechState('READY', [0, 1, 2]));
    await renderAndPress();

    await waitFor(() => expect(audioSrc()).not.toBeNull());
    const first = audioSrc();
    // Segment 1 is playing and segment 2 is already fetched (near-gapless).
    await waitFor(() => expect(mockGetSegmentAudio).toHaveBeenCalledWith('file-1'));
    expect(mockGetSegmentAudio).toHaveBeenNthCalledWith(1, 'file-0');
    expect(screen.getByTestId('message-speech-status')).toHaveTextContent(
      'chat.speech.progress:1/3',
    );

    fireEvent.ended(screen.getByTestId('message-speech-audio'));
    await waitFor(() => expect(audioSrc()).not.toBe(first));
    expect(screen.getByTestId('message-speech-status')).toHaveTextContent(
      'chat.speech.progress:2/3',
    );
    await waitFor(() => expect(mockGetSegmentAudio).toHaveBeenCalledWith('file-2'));

    fireEvent.ended(screen.getByTestId('message-speech-audio'));
    await waitFor(() =>
      expect(screen.getByTestId('message-speech-status')).toHaveTextContent(
        'chat.speech.progress:3/3',
      ),
    );
    fireEvent.ended(screen.getByTestId('message-speech-audio'));

    await waitFor(() =>
      expect(screen.getByTestId('message-speech-status')).toHaveTextContent('chat.speech.finished'),
    );
    expect(mockGetState).not.toHaveBeenCalled();
    expect(mockStart).toHaveBeenCalledTimes(1);
    // Each part was fetched once, however often the player re-rendered.
    expect(mockGetSegmentAudio).toHaveBeenCalledTimes(3);
  });

  it('says "Preparing audio…" until part 1 arrives, polls every 700 ms, then stops', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockStart.mockResolvedValue(speechState('GENERATING', []));
    mockGetState
      .mockResolvedValueOnce(speechState('GENERATING', []))
      .mockResolvedValueOnce(speechState('GENERATING', [0]))
      .mockResolvedValue(speechState('READY', [0, 1, 2]));
    await renderAndPress();

    const status = await screen.findByTestId('message-speech-status');
    expect(status).toHaveTextContent('chat.speech.loading');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByTestId('message-speech-player')).toHaveAttribute('aria-busy', 'true');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(700);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(700);
    });
    await waitFor(() => expect(audioSrc()).not.toBeNull());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(700);
    });
    await waitFor(() => expect(mockGetState).toHaveBeenCalledTimes(3));

    // READY: no more requests, however long the player stays open.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(mockGetState).toHaveBeenCalledTimes(3);
  });

  it('never polls past the cap even if the job stays GENERATING', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockStart.mockResolvedValue(speechState('GENERATING', []));
    mockGetState.mockResolvedValue(speechState('GENERATING', []));
    await renderAndPress();
    await screen.findByTestId('message-speech-status');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(400_000);
    });

    expect(mockGetState.mock.calls.length).toBeLessThanOrEqual(260);
    const calls = mockGetState.mock.calls.length;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });
    expect(mockGetState.mock.calls.length).toBe(calls);
    expect(await screen.findByRole('alert')).toHaveTextContent('chat.speech.errors.timedOut');
  });

  it('stops polling and revokes the audio when closed (unmount cleanup)', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockStart.mockResolvedValue(speechState('GENERATING', [0]));
    mockGetState.mockResolvedValue(speechState('GENERATING', [0]));
    await renderAndPress();
    await waitFor(() => expect(audioSrc()).not.toBeNull());

    fireEvent.click(screen.getByTestId('message-speech-stop'));
    await waitFor(() =>
      expect(screen.queryByTestId('message-speech-player')).not.toBeInTheDocument(),
    );
    const calls = mockGetState.mock.calls.length;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_000);
    });

    expect(mockGetState.mock.calls.length).toBe(calls);
    expect(revokeObjectURL).toHaveBeenCalled();
  });

  it('pauses and resumes through the one audio element', async () => {
    mockStart.mockResolvedValue(speechState('READY', [0, 1, 2]));
    await renderAndPress();
    await waitFor(() => expect(audioSrc()).not.toBeNull());

    const toggle = screen.getByTestId('message-speech-toggle-pause');
    expect(toggle).toHaveAccessibleName('chat.speech.pause');
    // jsdom never starts media, so report it as playing.
    const paused = vi.spyOn(HTMLMediaElement.prototype, 'paused', 'get').mockReturnValue(false);
    fireEvent.click(toggle);
    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled();
    fireEvent.pause(screen.getByTestId('message-speech-audio'));

    await waitFor(() => expect(toggle).toHaveAccessibleName('chat.speech.play'));
    expect(screen.getByTestId('message-speech-status')).toHaveTextContent('chat.speech.paused');

    paused.mockReturnValue(true);
    fireEvent.click(toggle);
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalled();
    fireEvent.play(screen.getByTestId('message-speech-audio'));
    await waitFor(() => expect(toggle).toHaveAccessibleName('chat.speech.pause'));
  });

  it('skips a part a PARTIAL reading never produced and says so visibly', async () => {
    mockStart.mockResolvedValue(speechState('PARTIAL', [0, 2], { errorCode: 'TTS_FAILED' }));
    await renderAndPress();
    await waitFor(() => expect(audioSrc()).not.toBeNull());

    expect(screen.getByTestId('message-speech-partial')).toBeVisible();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    fireEvent.ended(screen.getByTestId('message-speech-audio'));

    await waitFor(() =>
      expect(screen.getByTestId('message-speech-status')).toHaveTextContent(
        'chat.speech.progress:3/3',
      ),
    );
  });

  it('says in visible text when only the first part was read', async () => {
    mockStart.mockResolvedValue(speechState('READY', [0], { truncated: true, totalSegments: 1 }));
    await renderAndPress();
    expect(await screen.findByText('chat.speech.truncated')).toBeVisible();
  });

  it.each([
    ['PAYG_CREDIT_EXHAUSTED', 402, 'billing.errors.PAYG_CREDIT_EXHAUSTED'],
    ['TTS_UNAVAILABLE', 503, 'chat.speech.errors.unavailable'],
  ])('shows the localized error when the start is refused with %s', async (code, status, key) => {
    mockStart.mockRejectedValue(new ApiClientError({ message: 'refused', status, code }));
    await renderAndPress();

    expect(await screen.findByRole('alert')).toHaveTextContent(key);
    expect(screen.queryByTestId('message-speech-audio')).not.toBeInTheDocument();
    expect(mockGetState).not.toHaveBeenCalled();
  });

  it('shows the job own error code when it FAILED', async () => {
    mockStart.mockResolvedValue(speechState('FAILED', [], { errorCode: 'PAYG_CREDIT_EXHAUSTED' }));
    await renderAndPress();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'billing.errors.PAYG_CREDIT_EXHAUSTED',
    );
  });

  it('says so when a part cannot be loaded', async () => {
    mockStart.mockResolvedValue(speechState('READY', [0]));
    mockGetSegmentAudio.mockRejectedValue(new Error('403'));
    await renderAndPress();

    expect(await screen.findByRole('alert')).toHaveTextContent('chat.speech.errors.playback');
    expect(screen.getByTestId('message-speech-toggle-pause')).toBeDisabled();
  });
});
