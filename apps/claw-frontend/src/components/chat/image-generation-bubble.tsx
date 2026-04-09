import { Download, ExternalLink, Loader2, RefreshCw, XCircle } from 'lucide-react';

import { API_BASE_URL } from '@/constants';
import { ImageGenerationStatus } from '@/enums';
import { useImageGenerationListener } from '@/hooks/chat/use-image-generation-listener';
import { getImageStatusLabel, isInProgressImageStatus, resolveImageUrl } from '@/utilities';

export function ImageGenerationBubble({
  generationId,
  prompt,
}: {
  generationId: string;
  prompt: string;
}) {
  const generation = useImageGenerationListener(generationId);
  const statusLabel = getImageStatusLabel(generation?.status);
  const firstAsset = generation?.assets?.[0];
  const isInProgress = !generation || isInProgressImageStatus(generation.status);

  if (isInProgress) {
    return (
      <div className="my-2 rounded-xl border border-border bg-muted/30 p-4">
        <div className="mb-3 flex aspect-square max-h-64 w-full items-center justify-center rounded-lg bg-muted">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
        <div className="text-sm font-medium">{statusLabel}</div>
        <div className="mt-1 truncate text-xs text-muted-foreground">{prompt}</div>
      </div>
    );
  }

  if (
    generation.status === ImageGenerationStatus.FAILED ||
    generation.status === ImageGenerationStatus.TIMED_OUT
  ) {
    return (
      <div className="my-2 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
        <div className="flex items-center gap-2">
          <XCircle className="h-4 w-4 text-destructive" />
          <span className="text-sm font-medium text-destructive">{statusLabel}</span>
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          {generation.errorMessage ?? 'Image generation failed. Please try again.'}
        </div>
        <button
          className="mt-3 flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs hover:bg-muted"
          type="button"
        >
          <RefreshCw className="h-3 w-3" />
          Retry
        </button>
      </div>
    );
  }

  if (generation.status === ImageGenerationStatus.CANCELLED) {
    return (
      <div className="my-2 rounded-xl border border-border p-4">
        <div className="text-sm font-medium text-muted-foreground">Generation cancelled</div>
      </div>
    );
  }

  if (generation.status === ImageGenerationStatus.COMPLETED && firstAsset) {
    const imgSrc = resolveImageUrl(firstAsset.url, API_BASE_URL);
    const downloadHref = resolveImageUrl(firstAsset.downloadUrl, API_BASE_URL);

    return (
      <div className="my-2 rounded-xl border border-border p-3">
        <img
          alt={prompt}
          className="max-h-[512px] w-full rounded-lg object-cover"
          loading="lazy"
          src={imgSrc}
        />
        <div className="mt-2 flex items-center gap-2">
          <a
            className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs hover:bg-muted"
            download
            href={downloadHref}
          >
            <Download className="h-3 w-3" />
            Download
          </a>
          <a
            className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs hover:bg-muted"
            href={imgSrc}
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

  return (
    <div className="my-2 rounded-xl border border-border p-4">
      <div className="text-sm font-medium">{statusLabel}</div>
    </div>
  );
}
