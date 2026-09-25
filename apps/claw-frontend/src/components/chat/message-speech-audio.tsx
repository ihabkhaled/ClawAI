'use client';

import { Download, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useMessageSpeechAudio } from '@/hooks/chat/use-message-speech-audio';
import type { MessageSpeechAudioProps } from '@/types/message-speech.types';

/**
 * The spoken reply itself: a native player fed by the authenticated blob, plus
 * a Download that saves the real filename. The `<track>` is a real (empty)
 * captions track, as in AttachmentMediaPreview; `controlsList="nodownload"`
 * hides the player's own save, which would write a nameless "blob".
 */
export function MessageSpeechAudio({
  fileId,
  filename,
  mimeType,
}: MessageSpeechAudioProps): React.ReactElement {
  const { t, blobUrl, isLoading, hasError, download } = useMessageSpeechAudio(
    fileId,
    filename,
    mimeType,
  );

  return (
    <div className="flex w-full max-w-full min-w-0 flex-wrap items-center gap-2">
      {blobUrl === null ? null : (
        <audio
          className="w-full max-w-sm"
          controls
          controlsList="nodownload"
          autoPlay
          src={blobUrl}
          data-testid="message-speech-audio"
        >
          <track kind="captions" label={t('chat.attachment.noCaptionsAvailable')} />
          {filename}
        </audio>
      )}
      {isLoading ? (
        <Loader2
          className="text-muted-foreground h-4 w-4 motion-safe:animate-spin"
          aria-hidden="true"
        />
      ) : null}
      {hasError ? (
        <p role="alert" className="text-destructive text-xs">
          {t('chat.speech.errors.playback')}
        </p>
      ) : null}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={download}
        disabled={blobUrl === null}
        className="touch:min-h-11 h-8 gap-1 px-2 text-xs"
        data-testid="message-speech-download"
      >
        <Download className="h-3.5 w-3.5" aria-hidden="true" />
        {t('chat.speech.download')}
      </Button>
    </div>
  );
}
