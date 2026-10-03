import { VideoCancelledState } from '@/components/chat/video-cancelled-state';
import { VideoCompletedState } from '@/components/chat/video-completed-state';
import { VideoErrorState } from '@/components/chat/video-error-state';
import { VideoLoadingState } from '@/components/chat/video-loading-state';
import { VideoGenerationStatus } from '@/enums/video-generation-status.enum';
import { useAuthenticatedVideo } from '@/hooks/chat/use-authenticated-video';
import { useVideoGenerationBubbleState } from '@/hooks/chat/use-video-generation-bubble-state';
import { useTranslation } from '@/lib/i18n';
import type { VideoGenerationBubbleProps } from '@/types';
import {
  getVideoStatusLabelKey,
  isInProgressVideoStatus,
  resolveVideoFailureMessage,
} from '@/utilities';

export function VideoGenerationBubble({
  generationId,
  prompt,
}: VideoGenerationBubbleProps): React.ReactElement {
  const { t } = useTranslation();
  const { generation, canCancel, isCancelling, isStatusUnknown, handleCancel, handleRetry } =
    useVideoGenerationBubbleState({ generationId });
  const isCompleted = generation?.status === VideoGenerationStatus.COMPLETED;
  const assetPath = isCompleted
    ? (generation.asset?.downloadUrl ?? generation.asset?.url)
    : undefined;
  const { blobUrl, failed } = useAuthenticatedVideo(assetPath);
  const status = generation?.status;
  const loadFailed = isCompleted && (failed || generation.asset === null);

  return (
    <div className="my-2 w-full max-w-full">
      {isStatusUnknown ? (
        <VideoErrorState
          status={t('chat.videoStatusUnknown')}
          error={t('chat.videoStatusUnknownHint')}
          provider={generation?.provider}
          model={generation?.model}
        />
      ) : null}
      {!isStatusUnknown && (!generation || isInProgressVideoStatus(generation.status)) ? (
        <VideoLoadingState
          stageText={t(getVideoStatusLabelKey(status))}
          prompt={prompt}
          provider={generation?.provider}
          model={generation?.model}
          note={t('chat.videoTakesMinutes')}
          onCancel={canCancel ? handleCancel : undefined}
          cancelLabel={t(isCancelling ? 'chat.videoCancelling' : 'common.cancel')}
          cancelAriaLabel={t('chat.videoCancelAria')}
          isCancelling={isCancelling}
        />
      ) : null}
      {status === VideoGenerationStatus.FAILED || status === VideoGenerationStatus.TIMED_OUT ? (
        <VideoErrorState
          status={t(getVideoStatusLabelKey(status))}
          error={resolveVideoFailureMessage(generation, t) ?? undefined}
          provider={generation?.provider}
          model={generation?.model}
          onRetry={handleRetry}
        />
      ) : null}
      {status === VideoGenerationStatus.CANCELLED ? (
        <VideoCancelledState
          label={t('chat.generationCancelled')}
          retryLabel={t('common.retry')}
          onRetry={handleRetry}
        />
      ) : null}
      {isCompleted && blobUrl ? <VideoCompletedState blobUrl={blobUrl} prompt={prompt} /> : null}
      {isCompleted && !blobUrl && !loadFailed ? (
        <VideoLoadingState stageText={t('chat.loadingVideo')} prompt={prompt} />
      ) : null}
      {loadFailed ? (
        <VideoErrorState status={t('chat.videoLoadFailed')} error={t('chat.videoLoadFailedHint')} />
      ) : null}
    </div>
  );
}
