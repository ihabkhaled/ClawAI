import { ImageCompletedState } from '@/components/chat/image-completed-state';
import { ImageErrorState } from '@/components/chat/image-error-state';
import { ImageLoadingState } from '@/components/chat/image-loading-state';
import { ImageGenerationStatus } from '@/enums';
import { useAuthenticatedImage } from '@/hooks/chat/use-authenticated-image';
import { useImageGenerationBubbleState } from '@/hooks/chat/use-image-generation-bubble-state';
import { useImageGenerationListener } from '@/hooks/chat/use-image-generation-listener';
import { getImageStatusLabel, isInProgressImageStatus } from '@/utilities';

export function ImageGenerationBubble({
  generationId,
  prompt,
  isAutoMode,
}: {
  generationId: string;
  prompt: string;
  isAutoMode?: boolean;
}) {
  const { activeGenId, handleRetry, handleRetryWithModel } = useImageGenerationBubbleState({
    generationId,
  });
  const generation = useImageGenerationListener(activeGenId);
  const firstAsset = generation?.assets?.[0];
  const blobUrl = useAuthenticatedImage(
    generation?.status === ImageGenerationStatus.COMPLETED ? firstAsset?.url : undefined,
  );

  return (
    <div className="my-2">
      {!generation || isInProgressImageStatus(generation.status) ? (
        <ImageLoadingState
          status={getImageStatusLabel(generation?.status)}
          prompt={prompt}
          provider={generation?.provider}
          model={generation?.model}
        />
      ) : null}
      {generation?.status === ImageGenerationStatus.FAILED ||
      generation?.status === ImageGenerationStatus.TIMED_OUT ? (
        <ImageErrorState
          status={getImageStatusLabel(generation.status)}
          error={generation.errorMessage}
          provider={generation.provider}
          model={generation.model}
          onRetry={handleRetry}
          showModelPicker={isAutoMode}
          onRetryWithModel={handleRetryWithModel}
        />
      ) : null}
      {generation?.status === ImageGenerationStatus.CANCELLED ? (
        <div className="rounded-xl border border-border p-4">
          <div className="text-sm font-medium text-muted-foreground">Generation cancelled</div>
        </div>
      ) : null}
      {generation?.status === ImageGenerationStatus.COMPLETED && blobUrl ? (
        <ImageCompletedState blobUrl={blobUrl} prompt={prompt} />
      ) : null}
      {generation?.status === ImageGenerationStatus.COMPLETED && !blobUrl ? (
        <ImageLoadingState status="Loading image..." prompt={prompt} />
      ) : null}
    </div>
  );
}
