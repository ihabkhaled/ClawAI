'use client';

import { Loader2, Pause, Play, Square } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useMessageSpeechPlayer } from '@/hooks/chat/use-message-speech-player';
import type { MessageSpeechPlayerProps } from '@/types/message-speech.types';

/**
 * The progressive read-aloud player: one audio element that plays the reply
 * part by part as the parts are synthesised, with play/pause and stop. The
 * status line is a polite live region; failures are alerts. A shortened or
 * partial reading says so in visible text, never only in a tooltip.
 */
export function MessageSpeechPlayback({ messageId }: MessageSpeechPlayerProps): React.ReactElement {
  const {
    t,
    phase,
    statusText,
    audioRef,
    currentUrl,
    isPaused,
    canTogglePause,
    togglePause,
    stop,
    onEnded,
    onPlay,
    onPause,
    onAudioError,
    isTruncated,
    isPartial,
    errorKey,
    isBusy,
  } = useMessageSpeechPlayer(messageId);

  return (
    <section
      aria-label={t('chat.speech.playerLabel')}
      aria-busy={isBusy ? 'true' : undefined}
      className="bg-card text-card-foreground flex w-full max-w-full min-w-0 flex-col items-start gap-1.5 rounded-lg border p-2"
      data-testid="message-speech-player"
      data-phase={phase}
    >
      <div className="flex w-full max-w-full min-w-0 flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={togglePause}
          disabled={!canTogglePause}
          aria-label={isPaused ? t('chat.speech.play') : t('chat.speech.pause')}
          className="touch:min-h-11 h-8 gap-1 px-2 text-xs"
          data-testid="message-speech-toggle-pause"
        >
          {isPaused ? (
            <Play className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <Pause className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          {isPaused ? t('chat.speech.play') : t('chat.speech.pause')}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={stop}
          aria-label={t('chat.speech.stop')}
          className="touch:min-h-11 h-8 gap-1 px-2 text-xs"
          data-testid="message-speech-stop"
        >
          <Square className="h-3.5 w-3.5" aria-hidden="true" />
          {t('chat.speech.stop')}
        </Button>
        <p
          role="status"
          aria-live="polite"
          className="text-muted-foreground flex min-w-0 items-center gap-1.5 text-xs break-words"
          data-testid="message-speech-status"
        >
          {isBusy ? (
            <Loader2 className="h-3.5 w-3.5 shrink-0 motion-safe:animate-spin" aria-hidden="true" />
          ) : null}
          {statusText}
        </p>
      </div>
      {currentUrl === null ? null : (
        <audio
          ref={audioRef}
          className="sr-only"
          autoPlay
          src={currentUrl}
          onEnded={onEnded}
          onPlay={onPlay}
          onPause={onPause}
          onError={onAudioError}
          data-testid="message-speech-audio"
        >
          <track kind="captions" label={t('chat.attachment.noCaptionsAvailable')} />
        </audio>
      )}
      {errorKey === null ? null : (
        <p role="alert" className="text-destructive text-xs break-words">
          {t(errorKey)}
        </p>
      )}
      {isPartial ? (
        <p
          className="text-muted-foreground text-xs break-words"
          data-testid="message-speech-partial"
        >
          {t('chat.speech.partial')}
        </p>
      ) : null}
      {isTruncated ? (
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
