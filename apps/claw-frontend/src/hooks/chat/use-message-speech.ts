import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { MESSAGE_SPEECH_LABEL_KEYS } from '@/constants/message-speech.constants';
import { MessageSpeechJobStatus } from '@/enums/message-speech-job-status.enum';
import { MessageSpeechStatus } from '@/enums/message-speech-status.enum';
import { useLatestMessageSpeech } from '@/hooks/chat/use-latest-message-speech';
import { useMessageSpeechAvailability } from '@/hooks/chat/use-message-speech-availability';
import { useMessageSpeechOpenFlag } from '@/hooks/chat/use-message-speech-open-flag';
import { useMessageSpeechState } from '@/hooks/chat/use-message-speech-state';
import { useTranslation } from '@/lib/i18n';
import { messageSpeechRepository } from '@/repositories/chat/message-speech.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { MessageSpeechState, UseMessageSpeechReturn } from '@/types/message-speech.types';
import {
  deriveMessageSpeechStatus,
  resolveMessageSpeechErrorKey,
  resolveSpeechUnavailableKey,
} from '@/utilities/message-speech.utility';

/**
 * The "Read aloud" button of one assistant reply: start, stop, retry.
 *
 * Pressing it opens the player and POSTs once; the backend answers READY (a
 * stored reading) or GENERATING (a background job), and the answer seeds the
 * job-state cache the player polls. A READY reading already in the cache
 * replays with no request. When the backend says read aloud cannot run, the
 * button stays VISIBLE but dimmed and its label is the reason.
 */
export function useMessageSpeech(messageId: string): UseMessageSpeechReturn {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { availability } = useMessageSpeechAvailability();
  const { isOpen, setOpen } = useMessageSpeechOpenFlag(messageId);
  const latest = useLatestMessageSpeech(messageId);
  // Read-only observer: the player is the one that polls.
  const { state } = useMessageSpeechState(messageId, { enabled: false, poll: false });
  const { mutate } = useMutation({
    mutationKey: queryKeys.speech.synthesize(messageId),
    mutationFn: () => messageSpeechRepository.start(messageId),
    onSuccess: (started: MessageSpeechState) => {
      queryClient.setQueryData(queryKeys.speech.state(messageId), started);
    },
  });

  const unavailableReason = availability?.available === false ? availability.reason : undefined;
  const isUnavailable = unavailableReason !== undefined;
  const status = deriveMessageSpeechStatus({
    isPending: latest.isPending,
    isOpen,
    isError: latest.isError,
    state,
  });
  const label =
    unavailableReason === undefined
      ? t(MESSAGE_SPEECH_LABEL_KEYS[status])
      : t(resolveSpeechUnavailableKey(unavailableReason));

  const toggle = useCallback((): void => {
    if (isUnavailable) {
      return;
    }
    if (isOpen && status !== MessageSpeechStatus.ERROR) {
      setOpen(false);
      return;
    }
    setOpen(true);
    if (state?.status === MessageSpeechJobStatus.READY) {
      return;
    }
    mutate();
  }, [isUnavailable, isOpen, status, state, setOpen, mutate]);

  return {
    t,
    status,
    isUnavailable,
    label,
    isPlayerOpen: isOpen,
    errorKey: latest.isError ? resolveMessageSpeechErrorKey(latest.error) : null,
    toggle,
  };
}
