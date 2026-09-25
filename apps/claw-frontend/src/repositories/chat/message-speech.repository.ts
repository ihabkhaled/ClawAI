import { MESSAGE_SPEECH_REQUEST_TIMEOUT_MS } from '@/constants/message-speech.constants';
import { apiClient } from '@/services/shared/api-client';
import type { SpeechAvailability, SynthesizedSpeech } from '@/types/message-speech.types';

/**
 * Read aloud (text-to-speech, multimodal batch 9). Availability is asked once
 * per page; synthesis returns a user-owned audio file that is played through
 * the authenticated download path. A second request for the same reply is
 * replayed by the backend for free.
 */
export const messageSpeechRepository = {
  async getAvailability(): Promise<SpeechAvailability> {
    const response = await apiClient.get<SpeechAvailability>('/chat-messages/speech/availability');
    return response.data;
  },

  async synthesize(messageId: string): Promise<SynthesizedSpeech> {
    const response = await apiClient.post<SynthesizedSpeech>(
      `/chat-messages/${messageId}/speech`,
      undefined,
      { timeout: MESSAGE_SPEECH_REQUEST_TIMEOUT_MS },
    );
    return response.data;
  },
};
