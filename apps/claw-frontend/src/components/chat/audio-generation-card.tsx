import { Download, RefreshCw, XCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { AudioGenerationStatus } from '@/enums/audio-generation-status.enum';
import { useAudioGenerationState } from '@/hooks/chat/use-audio-generation-state';
import { useAuthenticatedVideo } from '@/hooks/chat/use-authenticated-video';
import { useTranslation } from '@/lib/i18n';
import type { AudioGenerationCardProps } from '@/types/media-generation.types';
import {
  formatAudioDuration,
  getAudioDownloadFilename,
  getAudioStatusLabelKey,
  isInProgressAudioStatus,
} from '@/utilities/media-generation.utility';

/**
 * The card for speech or music a chat model made with the audio tool: a status line while it
 * runs, the native player with Download once it is ready, the failure text with Retry otherwise.
 * `dir="auto"` on the prompt keeps an Arabic or Persian prompt readable inside an English page.
 */
export function AudioGenerationCard({
  generationId,
  prompt,
}: AudioGenerationCardProps): React.ReactElement {
  const { t } = useTranslation();
  const { generation, isStatusUnknown, handleRetry } = useAudioGenerationState({ generationId });
  const status = generation?.status;
  const isCompleted = status === AudioGenerationStatus.COMPLETED;
  const assetPath = isCompleted
    ? (generation?.asset?.downloadUrl ?? generation?.asset?.url ?? generation?.assetUrl)
    : undefined;
  const { blobUrl, failed } = useAuthenticatedVideo(assetPath);
  const loadFailed = isCompleted && (failed || assetPath === undefined);
  const isFailure =
    status === AudioGenerationStatus.FAILED || status === AudioGenerationStatus.TIMED_OUT;
  const showError = isFailure || status === AudioGenerationStatus.CANCELLED || loadFailed;
  const isInProgress =
    !isStatusUnknown && (!generation || isInProgressAudioStatus(generation.status));
  const duration = formatAudioDuration(generation?.durationSec);
  const label = prompt ? `${t('mediaUi.audio.label')}: ${prompt}` : t('mediaUi.audio.label');

  return (
    <div
      className="border-border my-2 w-full max-w-full rounded-xl border p-3"
      data-testid="audio-generation-card"
    >
      {isInProgress ? (
        <div role="status" className="flex flex-col gap-1">
          <span className="text-sm font-medium">{t(getAudioStatusLabelKey(status))}</span>
          {prompt ? (
            <span dir="auto" className="text-muted-foreground line-clamp-2 text-xs break-words">
              {prompt}
            </span>
          ) : null}
        </div>
      ) : null}
      {isStatusUnknown ? (
        <div role="alert" className="text-muted-foreground text-xs break-words">
          {t('mediaUi.audio.statusUnknown')}
        </div>
      ) : null}
      {showError ? (
        <div role="alert" data-testid="audio-generation-error">
          <div className="flex items-center gap-2">
            <XCircle className="text-destructive h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="text-destructive text-sm font-medium">
              {loadFailed ? t('mediaUi.audio.loadFailed') : t(getAudioStatusLabelKey(status))}
            </span>
          </div>
          <div className="text-muted-foreground mt-1 text-xs break-words">
            {loadFailed ? t('mediaUi.audio.loadFailedHint') : null}
            {isFailure ? (generation?.errorMessage ?? t('chat.videoGenerationFailedRetry')) : null}
            {generation && !loadFailed ? (
              <span className="ms-1 opacity-60">
                ({generation.provider}/{generation.model})
              </span>
            ) : null}
          </div>
          {loadFailed ? null : (
            <Button
              variant="unstyled"
              size="unstyled"
              className="hover:bg-muted touch:min-h-11 mt-3 flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs"
              onClick={handleRetry}
              type="button"
            >
              <RefreshCw className="h-3 w-3" aria-hidden="true" />
              {t('common.retry')}
            </Button>
          )}
        </div>
      ) : null}
      {isCompleted && !loadFailed && !blobUrl ? (
        <div role="status" className="text-sm">
          {t('mediaUi.audio.preparing')}
        </div>
      ) : null}
      {isCompleted && blobUrl ? (
        <div className="flex flex-col gap-2">
          <audio
            aria-label={label}
            className="w-full max-w-full"
            controls
            data-testid="audio-generation-player"
            preload="metadata"
            src={blobUrl}
          >
            {/* Generated speech and music ship without a caption file; the track keeps the
                element valid for assistive tech until providers return captions. */}
            <track kind="captions" />
          </audio>
          <div className="flex flex-wrap items-center gap-2">
            <a
              className="hover:bg-muted touch:min-h-11 flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs"
              download={getAudioDownloadFilename(
                generation?.mimeType ?? generation?.asset?.mimeType,
              )}
              href={blobUrl}
            >
              <Download className="h-3 w-3" aria-hidden="true" />
              {t('common.download')}
            </a>
            {duration ? (
              <span className="text-muted-foreground text-xs">
                {t('mediaUi.video.duration').replace('{duration}', duration)}
              </span>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
