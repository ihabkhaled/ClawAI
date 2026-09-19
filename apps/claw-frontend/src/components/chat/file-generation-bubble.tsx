import { FileCompletedState } from '@/components/chat/file-completed-state';
import { FileErrorState } from '@/components/chat/file-error-state';
import { FileExpiredState } from '@/components/chat/file-expired-state';
import { FileLoadingState } from '@/components/chat/file-loading-state';
import { FileGenerationStatus } from '@/enums';
import { useFileGenerationBubble } from '@/hooks/chat/use-file-generation-bubble';
import { useTranslation } from '@/lib/i18n';
import { fileGenerationRepository } from '@/repositories/file-generation/file-generation.repository';
import type { FileGenerationBubbleProps } from '@/types';
import { getFileStatusLabel, isInProgressFileStatus } from '@/utilities';

/**
 * A generated file as it lives in the chat: progress, then a download that is
 * good for one hour, then a rebuild (free, same file) or a regenerate (the AI
 * again). It persists with the message, so it survives a refresh.
 */
export function FileGenerationBubble({
  generationId,
  prompt,
  onRegenerate,
}: FileGenerationBubbleProps): React.ReactElement {
  const { t } = useTranslation();
  const view = useFileGenerationBubble(generationId);
  const { generation, asset } = view;
  const filename = generation?.filename ?? 'download';
  const isCompleted = generation?.status === FileGenerationStatus.COMPLETED;

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
        <div className="border-border rounded-xl border p-4">
          <div className="text-muted-foreground text-sm font-medium">
            {t('chat.fileGenerationCancelled')}
          </div>
        </div>
      ) : null}
      {isCompleted && asset && !view.expired ? (
        <FileCompletedState
          filename={filename}
          format={generation.format}
          sizeBytes={asset.sizeBytes}
          minutesLeft={view.minutesLeft}
          isDownloading={view.isDownloading}
          downloadFailed={view.downloadFailed}
          onDownload={view.download}
        />
      ) : null}
      {isCompleted && asset && view.expired ? (
        <FileExpiredState
          filename={filename}
          format={generation.format}
          isRebuilding={view.isRebuilding}
          onRebuild={view.rebuild}
          onRegenerate={onRegenerate}
        />
      ) : null}
    </div>
  );
}
