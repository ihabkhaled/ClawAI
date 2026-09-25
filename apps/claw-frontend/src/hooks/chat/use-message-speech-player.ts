import { useLatestMessageSpeech } from '@/hooks/chat/use-latest-message-speech';
import { useMessageSpeechOpenFlag } from '@/hooks/chat/use-message-speech-open-flag';
import { useTranslation } from '@/lib/i18n';
import type { UseMessageSpeechPlayerReturn } from '@/types/message-speech.types';
import {
  isSynthesizedSpeech,
  resolveMessageSpeechErrorKey,
} from '@/utilities/message-speech.utility';

/**
 * The read-aloud player under one reply. It reads the request the button
 * started (through the shared mutation key) and the shared open flag, so the
 * two never need a prop between them.
 */
export function useMessageSpeechPlayer(messageId: string): UseMessageSpeechPlayerReturn {
  const { t } = useTranslation();
  const { isOpen } = useMessageSpeechOpenFlag(messageId);
  const latest = useLatestMessageSpeech(messageId);

  return {
    t,
    isOpen,
    isLoading: latest.isPending,
    speech: latest.isSuccess && isSynthesizedSpeech(latest.data) ? latest.data : null,
    errorKey: latest.isError ? resolveMessageSpeechErrorKey(latest.error) : null,
  };
}
