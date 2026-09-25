'use client';

import { Loader2, Square, Volume2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { MessageSpeechStatus } from '@/enums/message-speech-status.enum';
import { useMessageSpeech } from '@/hooks/chat/use-message-speech';
import { cn } from '@/lib/utils';
import type { MessageSpeechActionProps } from '@/types/message-speech.types';

/**
 * "Read aloud" in an assistant reply's action row. Idle shows a speaker, a
 * request in flight a spinner, an open player a stop square. When the backend
 * says read aloud cannot run, the button stays visible but dimmed and its
 * label names the reason; pressing it does nothing.
 */
export function MessageSpeechAction({ messageId }: MessageSpeechActionProps): React.ReactElement {
  const { status, isUnavailable, label, toggle } = useMessageSpeech(messageId);

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      onClick={toggle}
      aria-label={label}
      title={label}
      aria-disabled={isUnavailable ? 'true' : undefined}
      aria-busy={status === MessageSpeechStatus.LOADING ? 'true' : undefined}
      data-testid="message-speech-action"
      data-status={status}
      className={cn(
        'text-muted-foreground h-7 w-7',
        isUnavailable && 'cursor-not-allowed opacity-50',
        status === MessageSpeechStatus.ERROR && 'text-destructive',
      )}
    >
      {status === MessageSpeechStatus.LOADING ? (
        <Loader2 className="h-3.5 w-3.5 motion-safe:animate-spin" aria-hidden="true" />
      ) : null}
      {status === MessageSpeechStatus.PLAYING ? (
        <Square className="h-3.5 w-3.5" aria-hidden="true" />
      ) : null}
      {status === MessageSpeechStatus.IDLE || status === MessageSpeechStatus.ERROR ? (
        <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
      ) : null}
    </Button>
  );
}
