import { Download, FileText, Loader2, RefreshCw, XCircle } from 'lucide-react';

import { FileGenerationStatus } from '@/enums';
import { useAuthenticatedImage } from '@/hooks/chat/use-authenticated-image';
import { useFileGenerationListener } from '@/hooks/chat/use-file-generation-listener';
import { fileGenerationRepository } from '@/repositories/file-generation/file-generation.repository';
import { formatFileSizeLabel, getFileStatusLabel, isInProgressFileStatus } from '@/utilities';

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

function FileLoadingState({
  status,
  prompt,
  format,
}: {
  status: string;
  prompt: string;
  format?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-muted/30 p-4">
      <div className="mb-2 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
        <div>
          <div className="text-sm font-medium">{status}</div>
          {format ? (
            <div className="text-xs text-muted-foreground">{format.toUpperCase()}</div>
          ) : null}
        </div>
      </div>
      <div className="truncate text-xs text-muted-foreground">{prompt}</div>
    </div>
  );
}

function FileErrorState({
  status,
  error,
  onRetry,
}: {
  status: string;
  error?: string | null;
  onRetry: () => void;
}) {
  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
      <div className="flex items-center gap-2">
        <XCircle className="h-4 w-4 text-destructive" />
        <span className="text-sm font-medium text-destructive">{status}</span>
      </div>
      <div className="mt-1 text-xs text-muted-foreground">
        {error ?? 'File generation failed. Please try again.'}
      </div>
      <button
        className="mt-3 flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs hover:bg-muted"
        onClick={onRetry}
        type="button"
      >
        <RefreshCw className="h-3 w-3" />
        Retry
      </button>
    </div>
  );
}

function FileCompletedState({
  blobUrl,
  filename,
  format,
  sizeBytes,
}: {
  blobUrl: string;
  filename: string;
  format: string;
  sizeBytes: number | null;
}) {
  const sizeLabel = sizeBytes ? formatFileSizeLabel(sizeBytes) : '';

  return (
    <div className="rounded-xl border border-border p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <FileText className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{filename}</div>
          <div className="text-xs text-muted-foreground">
            {format.toUpperCase()}
            {sizeLabel ? ` \u00b7 ${sizeLabel}` : ''}
          </div>
        </div>
        <a
          className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs hover:bg-muted"
          download={filename}
          href={blobUrl}
        >
          <Download className="h-3.5 w-3.5" />
          Download
        </a>
      </div>
    </div>
  );
}
