import { useMutationState } from '@tanstack/react-query';

import { MESSAGE_SPEECH_EMPTY_SNAPSHOT } from '@/constants/message-speech.constants';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { MessageSpeechMutationSnapshot } from '@/types/message-speech.types';
import { toMessageSpeechSnapshot } from '@/utilities/message-speech.utility';

/**
 * The newest read-aloud request for one reply, wherever it was started. The
 * button and the player both read it, so a remounted bubble (the list is
 * virtualized) still shows the request that is in flight or already done.
 */
export function useLatestMessageSpeech(messageId: string): MessageSpeechMutationSnapshot {
  const snapshots = useMutationState({
    filters: { mutationKey: queryKeys.speech.synthesize(messageId), exact: true },
    select: (mutation) => toMessageSpeechSnapshot(mutation.state),
  });
  return snapshots.at(-1) ?? MESSAGE_SPEECH_EMPTY_SNAPSHOT;
}
