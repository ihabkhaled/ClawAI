import { ImageIcon, StopCircle } from 'lucide-react';

import { StreamProgressBar } from '@/components/chat/stream/stream-progress-bar';
import { Button } from '@/components/ui/button';
import { AiStreamProgressConfidence } from '@/enums';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { ImageGenerationProgressPanelProps } from '@/types';

/**
 * Renders step-by-step Stable Diffusion sampling progress.
 *
 * Reads the latest ClawRuntimeProgressEnvelope surfaced by the
 * `useImageGenerationListener` hook and renders:
 *  - a progress bar (currentStep / totalSteps -> percent),
 *  - the eta_relative remaining in seconds when the WebUI reports it,
 *  - an optional preview frame (base64 PNG) when CLAW_IMAGE_PROGRESS_PREVIEW_ENABLED,
 *  - an interrupt button that calls back into the cancel hook.
 *
 * Falls back to a generic "starting" line when no envelope has arrived yet.
 */
export function ImageGenerationProgressPanel({
  className,
  progress,
  onCancel,
  isCancelling = false,
  prompt,
}: ImageGenerationProgressPanelProps): React.ReactElement {
  const { t } = useTranslation();
  const metrics = progress?.metrics;
  const currentStep = metrics?.currentStep ?? 0;
  const totalSteps = metrics?.totalSteps ?? 0;
  const progressPercent = metrics?.progressPercent ?? 0;
  const samplingMs = metrics?.samplingMs;
  const previewBase64 = progress?.imagePreviewBase64;
  const hasSteps = totalSteps > 0;
  const etaSeconds =
    typeof samplingMs === 'number' && Number.isFinite(samplingMs) ? samplingMs / 1000 : undefined;

  return (
    <section
      className={cn(
        'flex w-full max-w-xl flex-col gap-3 rounded-2xl border border-sky-500/25 bg-card p-3 shadow-sm',
        className,
      )}
      aria-label={t('runtimeProgress.image.title')}
    >
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ImageIcon className="h-4 w-4 text-sky-500" aria-hidden />
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-700 dark:text-sky-300">
              {t('runtimeProgress.image.title')}
            </div>
            <div className="truncate text-sm font-medium text-foreground">
              {hasSteps
                ? t('runtimeProgress.image.stepProgress', {
                    current: String(currentStep),
                    total: String(totalSteps),
                  })
                : t('runtimeProgress.image.starting')}
            </div>
          </div>
        </div>
        {onCancel ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-destructive"
            onClick={onCancel}
            disabled={isCancelling}
            aria-label={t('runtimeProgress.image.interrupt')}
          >
            <StopCircle className="h-3.5 w-3.5" />
            {t('runtimeProgress.image.interrupt')}
          </Button>
        ) : null}
      </header>

      <StreamProgressBar
        percent={progressPercent}
        confidence={AiStreamProgressConfidence.PROVIDER_REPORTED}
      />

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {etaSeconds !== undefined ? (
          <span>{t('runtimeProgress.image.eta', { seconds: etaSeconds.toFixed(1) })}</span>
        ) : null}
        {progress?.rawProviderEventType ? (
          <span className="font-mono text-[10px] uppercase tracking-wide">
            {progress.rawProviderEventType}
          </span>
        ) : null}
      </div>

      {previewBase64 ? (
        <img
          src={`data:image/png;base64,${previewBase64}`}
          alt={prompt ?? t('runtimeProgress.image.preview')}
          className="max-h-48 w-auto rounded-lg border border-border object-contain"
        />
      ) : null}
    </section>
  );
}
