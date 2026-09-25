import { SpeechUnavailableReason } from '@claw/shared-types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MESSAGE_SPEECH_REQUEST_TIMEOUT_MS } from '@/constants/message-speech.constants';
import { messageSpeechRepository } from '@/repositories/chat/message-speech.repository';

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockGetBlob = vi.fn();

vi.mock('@/services/shared/api-client', () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    getBlob: (...args: unknown[]) => mockGetBlob(...args),
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

  it('starts a reading with no body and a short timeout: the job runs in the background', async () => {
    const state = {
      status: 'GENERATING',
      segments: [],
      totalSegments: 3,
      truncated: false,
      errorCode: null,
    };
    mockPost.mockResolvedValue({ data: state, status: 202 });

    const result = await messageSpeechRepository.start('msg-7');

    expect(mockPost).toHaveBeenCalledWith('/chat-messages/msg-7/speech', undefined, {
      timeout: MESSAGE_SPEECH_REQUEST_TIMEOUT_MS,
    });
    expect(MESSAGE_SPEECH_REQUEST_TIMEOUT_MS).toBeLessThanOrEqual(15_000);
    expect(result).toEqual(state);
  });

  it('polls the same path with GET', async () => {
    mockGet.mockResolvedValue({ data: { status: 'READY' }, status: 200 });
    await messageSpeechRepository.getState('msg-7');
    expect(mockGet).toHaveBeenCalledWith('/chat-messages/msg-7/speech');
  });

  it('fetches a segment through the authenticated blob client', async () => {
    const blob = new Blob(['RIFF']);
    mockGetBlob.mockResolvedValue({ data: blob, status: 200 });
    await expect(messageSpeechRepository.getSegmentAudio('file 1')).resolves.toBe(blob);
    expect(mockGetBlob).toHaveBeenCalledWith('/files/download/file%201');
  });

  it('lets a refusal propagate so the caller can map its code', async () => {
    mockPost.mockRejectedValue(new Error('refused'));

    await expect(messageSpeechRepository.start('msg-7')).rejects.toThrow('refused');
  });
});
