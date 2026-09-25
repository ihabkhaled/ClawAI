import { SpeechUnavailableReason } from '@claw/shared-types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MessageSpeechStatus } from '@/enums/message-speech-status.enum';
import { useMessageSpeech } from '@/hooks/chat/use-message-speech';
import { ApiClientError } from '@/services/shared/api-client';

const mockGetAvailability = vi.fn();
const mockSynthesize = vi.fn();

vi.mock('@/repositories/chat/message-speech.repository', () => ({
  messageSpeechRepository: {
    getAvailability: (...args: unknown[]) => mockGetAvailability(...args),
    start: (...args: unknown[]) => mockSynthesize(...args),
    getState: vi.fn(),
  },
}));
vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ locale: 'en', t: (key: string) => key }),
}));

const SPEECH = {
  status: 'READY',
  segments: [{ index: 0, fileId: 'file-1', mimeType: 'audio/wav', characters: 120 }],
  totalSegments: 1,
  truncated: false,
  errorCode: null,
};

function makeWrapper(): (props: { children: ReactNode }) => React.ReactElement {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }): React.ReactElement {
    return createElement(QueryClientProvider, { client }, children);
  };
}

describe('useMessageSpeech', () => {
  beforeEach(() => {
    mockGetAvailability.mockReset().mockResolvedValue({ available: true, reason: null });
    mockSynthesize.mockReset().mockResolvedValue(SPEECH);
  });

  it('loads availability once and starts idle with the read-aloud label', async () => {
    const { result } = renderHook(() => useMessageSpeech('msg-1'), { wrapper: makeWrapper() });

    await waitFor(() => expect(mockGetAvailability).toHaveBeenCalledTimes(1));
    expect(result.current.status).toBe(MessageSpeechStatus.IDLE);
    expect(result.current.isUnavailable).toBe(false);
    expect(result.current.label).toBe('chat.speech.action');
  });

  it('requests synthesis once, opens the player, and a second press stops it', async () => {
    const { result } = renderHook(() => useMessageSpeech('msg-1'), { wrapper: makeWrapper() });
    await waitFor(() => expect(mockGetAvailability).toHaveBeenCalled());

    act(() => result.current.toggle());

    await waitFor(() => expect(result.current.status).toBe(MessageSpeechStatus.PLAYING));
    expect(mockSynthesize).toHaveBeenCalledTimes(1);
    expect(mockSynthesize).toHaveBeenCalledWith('msg-1');
    expect(result.current.isPlayerOpen).toBe(true);
    expect(result.current.label).toBe('chat.speech.stop');

    act(() => result.current.toggle());

    await waitFor(() => expect(result.current.isPlayerOpen).toBe(false));
    expect(result.current.status).toBe(MessageSpeechStatus.IDLE);
    expect(mockSynthesize).toHaveBeenCalledTimes(1);

    // A READY reading in the cache replays with no request at all.
    act(() => result.current.toggle());
    await waitFor(() => expect(result.current.status).toBe(MessageSpeechStatus.PLAYING));
    expect(mockSynthesize).toHaveBeenCalledTimes(1);
  });

  it('stays loading while the job has produced no segment yet', async () => {
    mockSynthesize.mockResolvedValue({ ...SPEECH, status: 'GENERATING', segments: [] });
    const { result } = renderHook(() => useMessageSpeech('msg-1'), { wrapper: makeWrapper() });
    await waitFor(() => expect(mockGetAvailability).toHaveBeenCalled());

    act(() => result.current.toggle());

    await waitFor(() => expect(mockSynthesize).toHaveBeenCalledTimes(1));
    expect(result.current.status).toBe(MessageSpeechStatus.LOADING);
    expect(result.current.label).toBe('chat.speech.loading');
  });

  it('retries with a new start after an error instead of closing', async () => {
    mockSynthesize
      .mockRejectedValueOnce(new ApiClientError({ message: 'x', status: 502, code: 'TTS_FAILED' }))
      .mockResolvedValueOnce(SPEECH);
    const { result } = renderHook(() => useMessageSpeech('msg-1'), { wrapper: makeWrapper() });
    await waitFor(() => expect(mockGetAvailability).toHaveBeenCalled());

    act(() => result.current.toggle());
    await waitFor(() => expect(result.current.status).toBe(MessageSpeechStatus.ERROR));
    act(() => result.current.toggle());

    await waitFor(() => expect(result.current.status).toBe(MessageSpeechStatus.PLAYING));
    expect(mockSynthesize).toHaveBeenCalledTimes(2);
  });

  it('exposes the mapped error key when synthesis is refused', async () => {
    mockSynthesize.mockRejectedValue(
      new ApiClientError({ message: 'no voice', status: 503, code: 'TTS_UNAVAILABLE' }),
    );
    const { result } = renderHook(() => useMessageSpeech('msg-1'), { wrapper: makeWrapper() });
    await waitFor(() => expect(mockGetAvailability).toHaveBeenCalled());

    act(() => result.current.toggle());

    await waitFor(() => expect(result.current.status).toBe(MessageSpeechStatus.ERROR));
    expect(result.current.errorKey).toBe('chat.speech.errors.unavailable');
  });

  it('is dimmed with the reason and never calls synthesize when unavailable', async () => {
    mockGetAvailability.mockResolvedValue({
      available: false,
      reason: SpeechUnavailableReason.PLAN_DISABLED,
    });
    const { result } = renderHook(() => useMessageSpeech('msg-1'), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isUnavailable).toBe(true));
    expect(result.current.label).toBe('chat.speech.unavailable.planDisabled');

    act(() => result.current.toggle());

    expect(mockSynthesize).not.toHaveBeenCalled();
    expect(result.current.isPlayerOpen).toBe(false);
  });
});
