import { Download, Loader2, Play } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { AttachmentPreviewKind } from '@/enums/attachment-preview-kind.enum';
import { useAttachmentMediaPreview } from '@/hooks/chat/use-attachment-media-preview';
import type { AttachmentMediaPreviewProps } from '@/types/attachment-preview.types';

/**
 * A voice/video note under a sent message. Nothing downloads until Play is
 * pressed — then the same authenticated bytes feed a native <audio>/<video>
 * element, which is "playable" without a waveform library.
 */
export function AttachmentMediaPreview({
  fileId,
  filename,
  mimeType,
  kind,
  media,
}: AttachmentMediaPreviewProps): React.ReactElement {
  const { t, blobUrl, isLoading, error, play, download, posterSrc, durationLabel, posterAlt } =
    useAttachmentMediaPreview(fileId, filename, mimeType, media);
  const kindLabel = t(
    kind === AttachmentPreviewKind.Audio
      ? 'chat.attachment.voiceNote'
      : 'chat.attachment.videoNote',
  );

  // A recorded voice/video note has no caption track of its own — the
  // `<track>` below is a real (empty) captions track rather than a suppressed
  // lint finding, so the caption control the browser shows is honest about
  // there being nothing to turn on. `controlsList="nodownload"` hides the
  // player's own download, which saves a nameless "blob"; the button below
  // saves the real filename.
  if (blobUrl !== null) {
    return (
      <div className="bg-card text-card-foreground flex max-w-full flex-col items-start gap-1.5 rounded-lg border p-2">
        {kind === AttachmentPreviewKind.Audio ? (
          <audio
            className="w-64 max-w-full"
            controls
            controlsList="nodownload"
            autoPlay
            src={blobUrl}
            data-testid="attachment-audio-player"
          >
            <track kind="captions" label={t('chat.attachment.noCaptionsAvailable')} />
            {filename}
          </audio>
        ) : (
          <video
            className="max-h-64 w-64 max-w-full rounded-lg"
            controls
            controlsList="nodownload"
            autoPlay
            src={blobUrl}
            poster={posterSrc ?? undefined}
            data-testid="attachment-video-player"
          >
            <track kind="captions" label={t('chat.attachment.noCaptionsAvailable')} />
            {filename}
          </video>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={download}
          className="touch:min-h-11 h-8 gap-1 px-2 text-xs"
          data-testid="attachment-media-download"
        >
          <Download className="h-3.5 w-3.5" aria-hidden="true" />
          {t('chat.attachment.download')}
        </Button>
      </div>
    );
  }

  // A processed video: its stored thumbnail, the length, and Play over it.
  if (kind === AttachmentPreviewKind.Video && posterSrc !== null) {
    return (
      <div
        className="border-border bg-muted relative flex w-56 max-w-full flex-col overflow-hidden rounded-lg border"
        data-testid="attachment-video-thumbnail"
      >
        <img
          src={posterSrc}
          alt={posterAlt}
          className="aspect-video w-full object-cover"
          data-testid="attachment-video-poster"
        />
        <div className="flex min-w-0 items-center justify-between gap-2 p-1.5">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={play}
            disabled={isLoading}
            aria-label={t('chat.attachment.play')}
            className="touch:min-h-11 min-w-0 gap-1.5"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Play className="h-4 w-4" aria-hidden="true" />
            )}
            <span className="truncate">{isLoading ? t('chat.attachment.loading') : kindLabel}</span>
          </Button>
          {durationLabel === null ? null : (
            <span
              className="text-muted-foreground shrink-0 text-xs tabular-nums"
              data-testid="attachment-video-duration"
            >
              {durationLabel}
            </span>
          )}
        </div>
        {error === null ? null : (
          <span className="text-destructive px-2 pb-1.5 text-[10px]">
            {t('chat.attachment.previewFailed')}
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      className="border-border bg-muted flex h-20 w-40 flex-col items-center justify-center gap-1 rounded-lg border"
      data-testid="attachment-media-preview"
    >
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={play}
        disabled={isLoading}
        aria-label={t('chat.attachment.play')}
        className="touch:min-h-11 gap-1.5"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Play className="h-4 w-4" aria-hidden="true" />
        )}
        {isLoading ? t('chat.attachment.loading') : kindLabel}
      </Button>
      {error === null ? null : (
        <span className="text-destructive px-2 text-center text-[10px]">
          {t('chat.attachment.previewFailed')}
        </span>
      )}
    </div>
  );
}
