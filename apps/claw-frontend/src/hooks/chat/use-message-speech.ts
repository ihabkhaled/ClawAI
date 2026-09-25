import { useMutation } from '@tanstack/react-query';
import { useCallback } from 'react';

import { MESSAGE_SPEECH_LABEL_KEYS } from '@/constants/message-speech.constants';
import { MessageSpeechStatus } from '@/enums/message-speech-status.enum';
import { useLatestMessageSpeech } from '@/hooks/chat/use-latest-message-speech';
import { useMessageSpeechAvailability } from '@/hooks/chat/use-message-speech-availability';
import { useMessageSpeechOpenFlag } from '@/hooks/chat/use-message-speech-open-flag';
import { useTranslation } from '@/lib/i18n';
import { messageSpeechRepository } from '@/repositories/chat/message-speech.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { UseMessageSpeechReturn } from '@/types/message-speech.types';
import {
  deriveMessageSpeechStatus,
  resolveMessageSpeechErrorKey,
  resolveSpeechUnavailableKey,
} from '@/utilities/message-speech.utility';

/**
 * The "Read aloud" button of one assistant reply: start, stop, retry.
 *
 * When the backend says read aloud cannot run, the button stays VISIBLE but
 * dimmed and its label is the reason: a hidden control teaches nobody that the
 * feature exists or why it is off. Stopping closes the player; pressing again
 * re-requests, which the backend replays for free.
 */
export function useMessageSpeech(messageId: string): UseMessageSpeechReturn {
  const { t } = useTranslation();
  const { availability } = useMessageSpeechAvailability();
  const { isOpen, setOpen } = useMessageSpeechOpenFlag(messageId);
  const latest = useLatestMessageSpeech(messageId);
  const { mutate } = useMutation({
    mutationKey: queryKeys.speech.synthesize(messageId),
    mutationFn: () => messageSpeechRepository.synthesize(messageId),
  });

  const unavailableReason = availability?.available === false ? availability.reason : undefined;
  const isUnavailable = unavailableReason !== undefined;
  const status = deriveMessageSpeechStatus({ ...latest, isOpen });
  const label =
    unavailableReason === undefined
      ? t(MESSAGE_SPEECH_LABEL_KEYS[status])
      : t(resolveSpeechUnavailableKey(unavailableReason));

  const toggle = useCallback((): void => {
    if (isUnavailable || status === MessageSpeechStatus.LOADING) {
      return;
    }
    if (status === MessageSpeechStatus.PLAYING) {
      setOpen(false);
      return;
    }
    setOpen(true);
    mutate();
  }, [isUnavailable, status, setOpen, mutate]);

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
