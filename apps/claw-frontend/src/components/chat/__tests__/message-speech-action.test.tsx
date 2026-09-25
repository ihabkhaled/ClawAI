import { SpeechUnavailableReason } from '@claw/shared-types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MessageSpeechAction } from '@/components/chat/message-speech-action';

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

function renderAction(): void {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MessageSpeechAction messageId="msg-1" />
    </QueryClientProvider>,
  );
}

describe('MessageSpeechAction', () => {
  beforeEach(() => {
    mockGetAvailability.mockReset().mockResolvedValue({ available: true, reason: null });
    mockSynthesize.mockReset();
  });

  it.each([
    [SpeechUnavailableReason.PLAN_DISABLED, 'chat.speech.unavailable.planDisabled'],
    [SpeechUnavailableReason.NO_VOICE_CONFIGURED, 'chat.speech.unavailable.noVoice'],
  ])('stays visible but dimmed when %s, naming the reason', async (reason, key) => {
    mockGetAvailability.mockResolvedValue({ available: false, reason });
    renderAction();

    const button = await screen.findByRole('button', { name: key });
    expect(button).toBeVisible();
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).toHaveAttribute('title', key);
    expect(button).toHaveClass('opacity-50');

    fireEvent.click(button);

    expect(mockSynthesize).not.toHaveBeenCalled();
  });

  it('shows the loading state while the audio is being prepared', async () => {
    mockSynthesize.mockReturnValue(new Promise(() => undefined));
    renderAction();
    await waitFor(() => expect(mockGetAvailability).toHaveBeenCalled());

    fireEvent.click(screen.getByRole('button', { name: 'chat.speech.action' }));

    const button = await screen.findByRole('button', { name: 'chat.speech.loading' });
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button).toHaveAttribute('data-status', 'LOADING');
  });

  it('asks for speech once when available and pressed', async () => {
    mockSynthesize.mockResolvedValue({
      status: 'READY',
      segments: [{ index: 0, fileId: 'file-1', mimeType: 'audio/wav', characters: 20 }],
      totalSegments: 1,
      truncated: false,
      errorCode: null,
    });
    renderAction();
    await waitFor(() => expect(mockGetAvailability).toHaveBeenCalled());

    const button = screen.getByRole('button', { name: 'chat.speech.action' });
    expect(button).not.toHaveAttribute('aria-disabled');
    fireEvent.click(button);

    await screen.findByRole('button', { name: 'chat.speech.stop' });
    expect(mockSynthesize).toHaveBeenCalledTimes(1);
    expect(mockSynthesize).toHaveBeenCalledWith('msg-1');
  });
});
