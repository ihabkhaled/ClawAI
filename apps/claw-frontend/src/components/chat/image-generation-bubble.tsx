import { ChevronDown, Download, ExternalLink, Loader2, RefreshCw, XCircle } from 'lucide-react';
import { useState } from 'react';

import { IMAGE_MODEL_OPTIONS } from '@/constants';
import { ImageGenerationStatus } from '@/enums';
import { useAuthenticatedImage } from '@/hooks/chat/use-authenticated-image';
import { useImageGenerationListener } from '@/hooks/chat/use-image-generation-listener';
import { imageGenerationRepository } from '@/repositories/image-generation/image-generation.repository';
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
  const [activeGenId, setActiveGenId] = useState(generationId);
  const generation = useImageGenerationListener(activeGenId);
  const firstAsset = generation?.assets?.[0];
  const blobUrl = useAuthenticatedImage(
    generation?.status === ImageGenerationStatus.COMPLETED ? firstAsset?.url : undefined,
  );

  const handleRetry = (): void => {
    void imageGenerationRepository.retry(activeGenId);
  };

  const handleRetryWithModel = (provider: string, model: string): void => {
    void imageGenerationRepository.retryAlternate(activeGenId, provider, model).then((result) => {
      setActiveGenId(result.generationId);
    });
  };

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

function ImageLoadingState({
  status,
  prompt,
  provider,
  model,
}: {
  status: string;
  prompt: string;
  provider?: string;
  model?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-muted/30 p-4">
      <div className="mb-3 flex aspect-square max-h-64 w-full items-center justify-center rounded-lg bg-muted">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
      <div className="text-sm font-medium">{status}</div>
      {provider ? (
        <div className="mt-0.5 text-xs text-muted-foreground">
          {provider} / {model}
        </div>
      ) : null}
      <div className="mt-1 truncate text-xs text-muted-foreground">{prompt}</div>
    </div>
  );
}

function ImageErrorState({
  status,
  error,
  provider,
  model,
  onRetry,
  showModelPicker,
  onRetryWithModel,
}: {
  status: string;
  error?: string | null;
  provider?: string;
  model?: string;
  onRetry: () => void;
  showModelPicker?: boolean;
  onRetryWithModel?: (provider: string, model: string) => void;
}) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const currentKey = `${provider ?? ''}/${model ?? ''}`;

  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
      <div className="flex items-center gap-2">
        <XCircle className="h-4 w-4 text-destructive" />
        <span className="text-sm font-medium text-destructive">{status}</span>
      </div>
      <div className="mt-1 text-xs text-muted-foreground">
        {error ?? 'Image generation failed. Please try again.'}
        {provider ? (
          <span className="ms-1 opacity-60">
            ({provider}/{model})
          </span>
        ) : null}
      </div>
      <div className="relative mt-3 flex items-center gap-2">
        <button
          className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs hover:bg-muted"
          onClick={onRetry}
          type="button"
        >
          <RefreshCw className="h-3 w-3" />
          Retry
        </button>
        {showModelPicker && onRetryWithModel ? (
          <div className="relative">
            <button
              className="flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs text-primary hover:bg-primary/10"
              onClick={() => setIsPickerOpen(!isPickerOpen)}
              type="button"
            >
              <RefreshCw className="h-3 w-3" />
              Try another model
              <ChevronDown className="h-3 w-3" />
            </button>
            {isPickerOpen ? (
              <div className="absolute start-0 top-full z-10 mt-1 min-w-48 rounded-lg border bg-popover p-1 shadow-md">
                {IMAGE_MODEL_OPTIONS.filter(
                  (opt) => `${opt.provider}/${opt.model}` !== currentKey,
                ).map((opt) => (
                  <button
                    key={`${opt.provider}-${opt.model}`}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-start text-xs hover:bg-muted"
                    onClick={() => {
                      onRetryWithModel(opt.provider, opt.model);
                      setIsPickerOpen(false);
                    }}
                    type="button"
                  >
                    <span className="font-medium">{opt.label}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
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
