import { FileCompletedState } from '@/components/chat/file-completed-state';
import { FileErrorState } from '@/components/chat/file-error-state';
import { FileLoadingState } from '@/components/chat/file-loading-state';
import { FileGenerationStatus } from '@/enums';
import { useAuthenticatedImage } from '@/hooks/chat/use-authenticated-image';
import { useFileGenerationListener } from '@/hooks/chat/use-file-generation-listener';
import { fileGenerationRepository } from '@/repositories/file-generation/file-generation.repository';
import { getFileStatusLabel, isInProgressFileStatus } from '@/utilities';

export function FileGenerationBubble({
  generationId,
  prompt,
}: {
  generationId: string;
  prompt: string;
}) {
  const generation = useFileGenerationListener(generationId);
  const firstAsset = generation?.assets?.[0];
  const blobUrl = useAuthenticatedImage(
    generation?.status === FileGenerationStatus.COMPLETED ? firstAsset?.url : undefined,
  );

  return (
    <div className="my-2">
      {!generation || isInProgressFileStatus(generation.status) ? (
        <FileLoadingState
          status={getFileStatusLabel(generation?.status)}
          prompt={prompt}
          format={generation?.format}
        />
      ) : null}
      {generation?.status === FileGenerationStatus.FAILED ||
      generation?.status === FileGenerationStatus.TIMED_OUT ? (
        <FileErrorState
          status={getFileStatusLabel(generation.status)}
          error={generation.errorMessage}
          onRetry={() => void fileGenerationRepository.retry(generationId)}
        />
      ) : null}
      {generation?.status === FileGenerationStatus.CANCELLED ? (
        <div className="rounded-xl border border-border p-4">
          <div className="text-sm font-medium text-muted-foreground">File generation cancelled</div>
        </div>
      ) : null}
      {generation?.status === FileGenerationStatus.COMPLETED && firstAsset && blobUrl ? (
        <FileCompletedState
          blobUrl={blobUrl}
          filename={generation.filename ?? 'download'}
          format={generation.format}
          sizeBytes={firstAsset.sizeBytes}
        />
      ) : null}
      {generation?.status === FileGenerationStatus.COMPLETED && !blobUrl ? (
        <FileLoadingState status="Preparing download..." prompt={prompt} />
      ) : null}
    </div>
  );
}
