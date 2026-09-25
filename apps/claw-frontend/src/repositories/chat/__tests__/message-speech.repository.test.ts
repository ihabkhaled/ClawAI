import { SpeechUnavailableReason } from '@claw/shared-types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MESSAGE_SPEECH_REQUEST_TIMEOUT_MS } from '@/constants/message-speech.constants';
import { messageSpeechRepository } from '@/repositories/chat/message-speech.repository';

const mockGet = vi.fn();
const mockPost = vi.fn();

vi.mock('@/services/shared/api-client', () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
  },
}));

describe('messageSpeechRepository', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockPost.mockReset();
  });

  it('reads availability from the shared endpoint', async () => {
    mockGet.mockResolvedValue({
      data: { available: false, reason: SpeechUnavailableReason.NO_VOICE_CONFIGURED },
      status: 200,
    });

    const availability = await messageSpeechRepository.getAvailability();

    expect(mockGet).toHaveBeenCalledWith('/chat-messages/speech/availability');
    expect(availability).toEqual({
      available: false,
      reason: SpeechUnavailableReason.NO_VOICE_CONFIGURED,
    });
  });

  it('synthesizes one message with no body and a long timeout', async () => {
    const speech = {
      fileId: 'file-1',
      mimeType: 'audio/wav',
      filename: 'reply.wav',
      truncated: true,
      characters: 4000,
      cached: false,
    };
    mockPost.mockResolvedValue({ data: speech, status: 200 });

    const result = await messageSpeechRepository.synthesize('msg-7');

    expect(mockPost).toHaveBeenCalledWith('/chat-messages/msg-7/speech', undefined, {
      timeout: MESSAGE_SPEECH_REQUEST_TIMEOUT_MS,
    });
    expect(result).toEqual(speech);
  });

  it('lets a refusal propagate so the caller can map its code', async () => {
    mockPost.mockRejectedValue(new Error('refused'));

    await expect(messageSpeechRepository.synthesize('msg-7')).rejects.toThrow('refused');
  });
});
