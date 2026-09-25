import { useQuery } from '@tanstack/react-query';

import { MESSAGE_SPEECH_AVAILABILITY_STALE_MS } from '@/constants/message-speech.constants';
import { messageSpeechRepository } from '@/repositories/chat/message-speech.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type {
  SpeechAvailability,
  UseMessageSpeechAvailabilityReturn,
} from '@/types/message-speech.types';

/**
 * Whether "Read aloud" can run for this user. One query for the whole page:
 * every assistant bubble reads the same cache entry, so a thread of fifty
 * replies asks once, not fifty times.
 */
export function useMessageSpeechAvailability(): UseMessageSpeechAvailabilityReturn {
  const query = useQuery<SpeechAvailability>({
    queryKey: queryKeys.speech.availability(),
    queryFn: () => messageSpeechRepository.getAvailability(),
    staleTime: MESSAGE_SPEECH_AVAILABILITY_STALE_MS,
    retry: false,
  });
  return { availability: query.data ?? null, isLoading: query.isLoading };
}
