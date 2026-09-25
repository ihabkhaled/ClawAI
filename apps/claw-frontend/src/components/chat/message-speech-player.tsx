'use client';

import { Loader2 } from 'lucide-react';

import { MessageSpeechAudio } from '@/components/chat/message-speech-audio';
import { useMessageSpeechPlayer } from '@/hooks/chat/use-message-speech-player';
import type { MessageSpeechPlayerProps } from '@/types/message-speech.types';

/**
 * The read-aloud player under an assistant reply. It sits outside the
 * hover-hidden action row, so once opened it stays visible on desktop too.
 * A truncated reading says so in visible text, never only in a tooltip.
 */
export function MessageSpeechPlayer({
  messageId,
}: MessageSpeechPlayerProps): React.ReactElement | null {
  const { t, isOpen, isLoading, speech, errorKey } = useMessageSpeechPlayer(messageId);

  if (!isOpen) {
    return null;
  }

  return (
    <section
      aria-label={t('chat.speech.playerLabel')}
      className="bg-card text-card-foreground flex w-full max-w-full min-w-0 flex-col items-start gap-1.5 rounded-lg border p-2"
      data-testid="message-speech-player"
    >
      {isLoading ? (
        <p role="status" className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <Loader2 className="h-3.5 w-3.5 motion-safe:animate-spin" aria-hidden="true" />
          {t('chat.speech.loading')}
        </p>
      ) : null}
      {errorKey === null ? null : (
        <p role="alert" className="text-destructive text-xs break-words">
          {t(errorKey)}
        </p>
      )}
      {speech === null ? null : (
        <MessageSpeechAudio
          key={speech.fileId}
          fileId={speech.fileId}
          filename={speech.filename}
          mimeType={speech.mimeType}
        />
      )}
      {speech?.truncated === true ? (
        <p
          className="text-muted-foreground text-xs break-words"
          data-testid="message-speech-truncated"
        >
          {t('chat.speech.truncated')}
        </p>
      ) : null}
    </section>
  );
}
