import { Download, ExternalLink, Loader2, RefreshCw, XCircle } from 'lucide-react';

import { ImageGenerationStatus } from '@/enums';
import { useAuthenticatedImage } from '@/hooks/chat/use-authenticated-image';
import { useImageGenerationListener } from '@/hooks/chat/use-image-generation-listener';
import { imageGenerationRepository } from '@/repositories/image-generation/image-generation.repository';
import { getImageStatusLabel, isInProgressImageStatus } from '@/utilities';

export function ImageGenerationBubble({
  generationId,
  prompt,
}: {
  generationId: string;
  prompt: string;
}) {
  const generation = useImageGenerationListener(generationId);
  const firstAsset = generation?.assets?.[0];
  const blobUrl = useAuthenticatedImage(
    generation?.status === ImageGenerationStatus.COMPLETED ? firstAsset?.url : undefined,
  );

  return (
    <div className="my-2">
      {!generation || isInProgressImageStatus(generation.status) ? (
        <ImageLoadingState status={getImageStatusLabel(generation?.status)} prompt={prompt} />
      ) : null}
      {generation?.status === ImageGenerationStatus.FAILED ||
      generation?.status === ImageGenerationStatus.TIMED_OUT ? (
        <ImageErrorState
          status={getImageStatusLabel(generation.status)}
          error={generation.errorMessage}
          onRetry={() => void imageGenerationRepository.retry(generationId)}
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

function ImageLoadingState({ status, prompt }: { status: string; prompt: string }) {
  return (
    <div className="rounded-xl border border-border bg-muted/30 p-4">
      <div className="mb-3 flex aspect-square max-h-64 w-full items-center justify-center rounded-lg bg-muted">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
      <div className="text-sm font-medium">{status}</div>
      <div className="mt-1 truncate text-xs text-muted-foreground">{prompt}</div>
    </div>
  );
}

function ImageErrorState({
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
        {error ?? 'Image generation failed. Please try again.'}
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

function ImageCompletedState({ blobUrl, prompt }: { blobUrl: string; prompt: string }) {
  return (
    <div className="rounded-xl border border-border p-3">
      <img alt={prompt} className="max-h-[512px] w-full rounded-lg object-cover" src={blobUrl} />
      <div className="mt-2 flex items-center gap-2">
        <a
          className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs hover:bg-muted"
          download="generated-image.png"
          href={blobUrl}
        >
          <Download className="h-3 w-3" />
          Download
        </a>
        <a
          className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs hover:bg-muted"
          href={blobUrl}
          rel="noreferrer"
          target="_blank"
        >
          <ExternalLink className="h-3 w-3" />
          Open
        </a>
      </div>
    </div>
  );
}
