import { ImageCancelledState } from '@/components/chat/image-cancelled-state';
import { ImageCompletedState } from '@/components/chat/image-completed-state';
import { ImageErrorState } from '@/components/chat/image-error-state';
import { ImageLoadingState } from '@/components/chat/image-loading-state';
import { ImageGenerationStatus } from '@/enums';
import { useAuthenticatedImage } from '@/hooks/chat/use-authenticated-image';
import { useImageGenerationBubbleState } from '@/hooks/chat/use-image-generation-bubble-state';
import { useTranslation } from '@/lib/i18n';
import { getImageStatusLabelKey, isInProgressImageStatus } from '@/utilities';

export function ImageGenerationBubble({
  generationId,
  prompt,
  isAutoMode,
}: {
  generationId: string;
  prompt: string;
  isAutoMode?: boolean;
}) {
  const { t } = useTranslation();
  const {
    generation,
    stageText,
    handleRetry,
    handleRetryWithModel,
    canCancel,
    isCancelling,
    handleCancel,
  } = useImageGenerationBubbleState({ generationId });
  const firstAsset = generation?.assets?.[0];
  const blobUrl = useAuthenticatedImage(
    generation?.status === ImageGenerationStatus.COMPLETED ? firstAsset?.url : undefined,
  );

  return (
    <div className="my-2">
      {!generation || isInProgressImageStatus(generation.status) ? (
        <ImageLoadingState
          status={t(getImageStatusLabelKey(generation?.status))}
          prompt={prompt}
          provider={generation?.provider}
          model={generation?.model}
          stageText={stageText}
          onCancel={canCancel ? handleCancel : undefined}
          cancelLabel={t(isCancelling ? 'chat.imageCancelling' : 'chat.imageCancel')}
          cancelAriaLabel={t('chat.imageCancelAria')}
          isCancelling={isCancelling}
        />
      ) : null}
      {generation?.status === ImageGenerationStatus.FAILED ||
      generation?.status === ImageGenerationStatus.TIMED_OUT ? (
        <ImageErrorState
          status={t(getImageStatusLabelKey(generation.status))}
          error={generation.errorMessage}
          provider={generation.provider}
          model={generation.model}
          onRetry={handleRetry}
          showModelPicker={isAutoMode}
          onRetryWithModel={handleRetryWithModel}
        />
      ) : null}
      {generation?.status === ImageGenerationStatus.CANCELLED ? (
        <ImageCancelledState
          label={t('chat.generationCancelled')}
          retryLabel={t('common.retry')}
          onRetry={handleRetry}
        />
      ) : null}
      {generation?.status === ImageGenerationStatus.COMPLETED && blobUrl ? (
        <ImageCompletedState blobUrl={blobUrl} prompt={prompt} />
      ) : null}
      {generation?.status === ImageGenerationStatus.COMPLETED && !blobUrl ? (
        <ImageLoadingState status={t('chat.loadingImage')} prompt={prompt} />
      ) : null}
    </div>
  );
}
