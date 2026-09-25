import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { queryKeys } from '@/repositories/shared/query-keys';
import type { UseMessageSpeechOpenFlagReturn } from '@/types/message-speech.types';

/**
 * Whether one reply's read-aloud player is open. Kept in the React Query cache
 * (never fetched) so the button in the hover row and the player below it share
 * it without prop-drilling through the bubble and without module-level state.
 */
export function useMessageSpeechOpenFlag(messageId: string): UseMessageSpeechOpenFlagReturn {
  const queryClient = useQueryClient();
  const { data } = useQuery<boolean>({
    queryKey: queryKeys.speech.player(messageId),
    queryFn: () => false,
    enabled: false,
    initialData: false,
    staleTime: Infinity,
  });

  const setOpen = useCallback(
    (open: boolean): void => {
      queryClient.setQueryData<boolean>(queryKeys.speech.player(messageId), open);
    },
    [queryClient, messageId],
  );

  return { isOpen: data, setOpen };
}
