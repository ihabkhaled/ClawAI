import { Loader2, Play } from 'lucide-react';

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
  kind,
}: AttachmentMediaPreviewProps): React.ReactElement {
  const { t, blobUrl, isLoading, error, play } = useAttachmentMediaPreview(fileId);
  const kindLabel = t(
    kind === AttachmentPreviewKind.Audio
      ? 'chat.attachment.voiceNote'
      : 'chat.attachment.videoNote',
  );

  // A recorded voice/video note has no caption track of its own — the
  // `<track>` below is a real (empty) captions track rather than a suppressed
  // lint finding, so the caption control the browser shows is honest about
  // there being nothing to turn on.
  if (blobUrl !== null) {
    return kind === AttachmentPreviewKind.Audio ? (
      <audio
        className="w-64 max-w-full"
        controls
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
        autoPlay
        src={blobUrl}
        data-testid="attachment-video-player"
      >
        <track kind="captions" label={t('chat.attachment.noCaptionsAvailable')} />
        {filename}
      </video>
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
