import { useQuery, useQueryClient } from '@tanstack/react-query';

import { messageSpeechRepository } from '@/repositories/chat/message-speech.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type {
  MessageSpeechState,
  UseMessageSpeechStateOptions,
  UseMessageSpeechStateReturn,
} from '@/types/message-speech.types';
import {
  isMessageSpeechPollExpired,
  nextMessageSpeechPollInterval,
} from '@/utilities/message-speech.utility';

/**
 * The progressive read-aloud job's state for one reply. The POST that starts
 * a reading seeds this cache entry; the player's observer then polls
 * `GET /chat-messages/:id/speech` every 700 ms while it says GENERATING, and
 * stops on READY / PARTIAL / FAILED, at the poll cap (the job's own 3-minute
 * deadline), or when the player unmounts. Never unbounded, and only one
 * observer polls (`poll`), so there is never more than one timer per reply.
 * `staleTime: Infinity`: a READY reading already in the cache replays with no
 * request at all.
 */
export function useMessageSpeechState(
  messageId: string,
  options: UseMessageSpeechStateOptions,
): UseMessageSpeechStateReturn {
  const queryClient = useQueryClient();
  const query = useQuery<MessageSpeechState>({
    queryKey: queryKeys.speech.state(messageId),
    queryFn: () => messageSpeechRepository.getState(messageId),
    enabled: options.enabled,
    staleTime: Infinity,
    retry: false,
    refetchOnWindowFocus: false,
    // Identical polls are structurally shared, so `data` alone would not
    // re-render at the poll cap; the update timestamps do.
    notifyOnChangeProps: ['data', 'dataUpdatedAt', 'errorUpdatedAt'],
    refetchInterval: options.poll
      ? (current) =>
          nextMessageSpeechPollInterval(
            current.state.data,
            current.state.dataUpdateCount + current.state.errorUpdateCount,
          )
      : false,
  });
  const cached = queryClient.getQueryState(queryKeys.speech.state(messageId));
  return {
    state: query.data,
    isPollingExpired: isMessageSpeechPollExpired(
      query.data,
      (cached?.dataUpdateCount ?? 0) + (cached?.errorUpdateCount ?? 0),
    ),
  };
}
