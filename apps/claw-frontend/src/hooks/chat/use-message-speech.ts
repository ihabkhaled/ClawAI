import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef } from 'react';

import { MESSAGE_SPEECH_LABEL_KEYS } from '@/constants/message-speech.constants';
import { MessageSpeechJobStatus } from '@/enums/message-speech-job-status.enum';
import { MessageSpeechStatus } from '@/enums/message-speech-status.enum';
import { useCancelMessageSpeech } from '@/hooks/chat/use-cancel-message-speech';
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
 * button stays VISIBLE but dimmed and its label is the reason. Pressing it
 * again (stop) while the job is still generating also stops the backend job.
 *
 * A stop pressed BEFORE the POST has answered used to be lost: there was no
 * job state yet, so there was nothing to cancel, and the job the POST then
 * started ran to the end with the player closed. The stop is now remembered
 * (one flag, not a queue) and applied the moment the POST answers — one
 * cancel request, and only if that answer is a job still GENERATING. Opening
 * the player again before the answer takes the stop back.
 */
export function useMessageSpeech(messageId: string): UseMessageSpeechReturn {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { availability } = useMessageSpeechAvailability();
  const { isOpen, setOpen } = useMessageSpeechOpenFlag(messageId);
  const latest = useLatestMessageSpeech(messageId);
  const cancelIfGenerating = useCancelMessageSpeech(messageId);
  // Survives a remount of the bubble (the list is virtualized): the mutation
  // callbacks below close over this ref object, not over a render.
  const pendingStopRef = useRef(false);
  // Read-only observer: the player is the one that polls.
  const { state } = useMessageSpeechState(messageId, { enabled: false, poll: false });
  const { mutate } = useMutation({
    mutationKey: queryKeys.speech.synthesize(messageId),
    mutationFn: () => messageSpeechRepository.start(messageId),
    onSuccess: (started: MessageSpeechState) => {
      queryClient.setQueryData(queryKeys.speech.state(messageId), started);
      if (pendingStopRef.current) {
        pendingStopRef.current = false;
        cancelIfGenerating(started);
      }
    },
    onError: () => {
      // Nothing started, so there is nothing left to stop.
      pendingStopRef.current = false;
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
      if (latest.isPending) {
        // No job id yet: stop it as soon as the POST says what it started.
        pendingStopRef.current = true;
      } else {
        cancelIfGenerating(state);
      }
      setOpen(false);
      return;
    }
    pendingStopRef.current = false;
    setOpen(true);
    if (state?.status === MessageSpeechJobStatus.READY) {
      return;
    }
    mutate();
  }, [isUnavailable, isOpen, status, state, setOpen, mutate, cancelIfGenerating, latest.isPending]);

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
