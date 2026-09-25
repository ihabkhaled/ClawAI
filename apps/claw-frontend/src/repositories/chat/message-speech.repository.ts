import {
  MESSAGE_SPEECH_FILE_PATH_PREFIX,
  MESSAGE_SPEECH_REQUEST_TIMEOUT_MS,
} from '@/constants/message-speech.constants';
import { apiClient } from '@/services/shared/api-client';
import type { MessageSpeechState, SpeechAvailability } from '@/types/message-speech.types';

/**
 * Read aloud (text-to-speech; progressive since 2026-09-25). Availability is
 * asked once per page. `start` never waits on a voice model: the backend
 * answers READY (a stored reading, replayed free) or GENERATING (a background
 * job is synthesising segment by segment), and `getState` is the poll.
 */
export const messageSpeechRepository = {
  async getAvailability(): Promise<SpeechAvailability> {
    const response = await apiClient.get<SpeechAvailability>('/chat-messages/speech/availability');
    return response.data;
  },

  async start(messageId: string): Promise<MessageSpeechState> {
    const response = await apiClient.post<MessageSpeechState>(
      `/chat-messages/${messageId}/speech`,
      undefined,
      { timeout: MESSAGE_SPEECH_REQUEST_TIMEOUT_MS },
    );
    return response.data;
  },

  async getState(messageId: string): Promise<MessageSpeechState> {
    const response = await apiClient.get<MessageSpeechState>(`/chat-messages/${messageId}/speech`);
    return response.data;
  },

  /** One segment's audio: an ordinary user-owned file, through the authenticated client. */
  async getSegmentAudio(fileId: string): Promise<Blob> {
    const response = await apiClient.getBlob(
      `${MESSAGE_SPEECH_FILE_PATH_PREFIX}${encodeURIComponent(fileId)}`,
    );
    return response.data;
  },
};
