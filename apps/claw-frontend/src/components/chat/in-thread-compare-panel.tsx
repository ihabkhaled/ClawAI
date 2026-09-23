import { CheckCircle, Loader2, Play } from 'lucide-react';

import { CompareCriticControls } from '@/components/chat/compare-critic-controls';
import { CompareJudgeControls } from '@/components/chat/compare-judge-controls';
import { ComposerDropzone } from '@/components/chat/composer-dropzone';
import { FileAttachmentPicker } from '@/components/chat/file-attachment-picker';
import { ParallelModelSelector } from '@/components/chat/parallel-model-selector';
import { ResearchToggle } from '@/components/chat/research-toggle';
import { RichPromptTextarea } from '@/components/chat/rich-prompt-textarea';
import { VoiceVideoRecorder } from '@/components/chat/voice-video-recorder';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useCompareMediaCapabilities } from '@/hooks/chat/use-compare-media-capabilities';
import type { InThreadComparePanelProps } from '@/types';

export function InThreadComparePanel({
  open,
  onOpenChange,
  selectedModels,
  onToggleModel,
  prompt,
  onPromptChange,
  onSend,
  result,
  isPending,
  canSend,
  judgeEnabled,
  onJudgeEnabledChange,
  judgeModel,
  onJudgeModelChange,
  judgeModelOptions,
  judgeModelOptionsLoading,
  criticEnabled,
  onCriticEnabledChange,
  criticModel,
  onCriticModelChange,
  research,
  onResearchChange,
  researchProviders,
  isResearchProvidersLoading,
  allowJudgeMode,
  allowCriticReview,
  allowResearchMode,
  selectedFileIds,
  onSelectedFileIdsChange,
  onIngestFiles,
  t,
}: InThreadComparePanelProps): React.ReactElement {
  // Multi-model gating: see useCompareMediaCapabilities. One recording goes to
  // every lane, so the buttons stay live unless no selected model can read it.
  const mediaCapabilities = useCompareMediaCapabilities(selectedModels);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            {t('compare.title')}
            <Badge variant="secondary" className="text-xs">
              {selectedModels.length} {t('nav.models')}
            </Badge>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 xl:grid xl:grid-cols-2 xl:gap-6 xl:space-y-0">
          <div className="space-y-4">
            <ParallelModelSelector
              selectedModels={selectedModels}
              onToggleModel={onToggleModel}
              selectionError={null}
              t={t}
            />

            {allowJudgeMode ? (
              <CompareJudgeControls
                judgeEnabled={judgeEnabled}
                onJudgeEnabledChange={onJudgeEnabledChange}
                judgeModel={judgeModel}
                onJudgeModelChange={onJudgeModelChange}
                judgeModelOptions={judgeModelOptions}
                judgeModelOptionsLoading={judgeModelOptionsLoading}
                t={t}
              />
            ) : null}

            {allowJudgeMode && allowCriticReview && judgeEnabled ? (
              <CompareCriticControls
                criticEnabled={criticEnabled}
                onCriticEnabledChange={onCriticEnabledChange}
                criticModel={criticModel}
                onCriticModelChange={onCriticModelChange}
                criticModelOptions={judgeModelOptions}
                criticModelOptionsLoading={judgeModelOptionsLoading}
                t={t}
              />
            ) : null}
          </div>

          <ComposerDropzone onFiles={onIngestFiles} disabled={isPending} className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <FileAttachmentPicker
                selectedFileIds={selectedFileIds}
                onChange={onSelectedFileIdsChange}
                disabled={isPending}
              />
              {/* Same recorder the chat composer and the nine labs render; the
                  consent dialog ships inside it, so it comes along. */}
              <VoiceVideoRecorder
                canSendAudio={mediaCapabilities.canSendAudio}
                canSendVideo={mediaCapabilities.canSendVideo}
                onRecorded={(file) => onIngestFiles([file])}
                disabled={isPending}
              />
              {/* The shared control, not Compare's mode-only one: Compare
                  never had a provider picker, and its default was NONE while
                  every other surface defaulted to AUTO. */}
              {allowResearchMode ? (
                <ResearchToggle
                  value={research}
                  providers={researchProviders}
                  isProvidersLoading={isResearchProvidersLoading}
                  onChange={onResearchChange}
                  disabled={isPending}
                />
              ) : null}
            </div>

            <form
              className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-end"
              onSubmit={(e) => {
                e.preventDefault();
                onSend();
              }}
            >
              <RichPromptTextarea
                value={prompt}
                onChange={onPromptChange}
                onSubmit={onSend}
                placeholder={t('compare.sendPrompt')}
                ariaLabel={t('compare.sendPrompt')}
                disabled={isPending}
                className="w-full min-w-0 flex-1"
              />
              <Button
                type="submit"
                disabled={!canSend || isPending}
                size="sm"
                className="w-full sm:w-auto"
              >
                {isPending ? (
                  <Loader2 className="me-2 h-4 w-4 animate-spin" />
                ) : (
                  <Play className="me-2 h-4 w-4" />
                )}
                {isPending ? t('compare.comparing') : t('compare.sendPrompt')}
              </Button>
            </form>

            {result ? (
              <div className="bg-muted flex items-center gap-2 rounded-md p-3 text-sm">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-muted-foreground">
                  {t('compare.processingMessage', { count: selectedModels.length })}
                </span>
              </div>
            ) : null}
          </ComposerDropzone>
        </div>
      </DialogContent>
    </Dialog>
  );
}
