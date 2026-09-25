import { CheckCircle, Loader2, Play } from 'lucide-react';

import { CompareCriticControls } from '@/components/chat/compare-critic-controls';
import { CompareJudgeControls } from '@/components/chat/compare-judge-controls';
import { ComposerAttachmentChips } from '@/components/chat/composer-attachment-chips';
import { ComposerAttachmentTray } from '@/components/chat/composer-attachment-tray';
import { ComposerDropzone } from '@/components/chat/composer-dropzone';
import { FileAttachmentPicker } from '@/components/chat/file-attachment-picker';
import { ParallelModelSelector } from '@/components/chat/parallel-model-selector';
import { ResearchToggle } from '@/components/chat/research-toggle';
import { RichPromptTextarea } from '@/components/chat/rich-prompt-textarea';
import { VoiceVideoRecorder } from '@/components/chat/voice-video-recorder';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useModelMediaCapabilities } from '@/hooks/chat/use-model-media-capabilities';
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
  attachmentTray,
  attachmentChips,
  t,
}: InThreadComparePanelProps): React.ReactElement {
  // Recorder gating is model-independent: see useModelMediaCapabilities. The
  // recording goes to every lane and each lane gets the transcript / frames.
  const mediaCapabilities = useModelMediaCapabilities();

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
        {/* The whole dialog body takes a dropped file, not only the prompt:
            the owner asked for a drop anywhere on the panel, the way ChatGPT
            and Claude behave. Scoping it to the prompt field (the previous
            choice) made the target a few rows tall. */}
        <ComposerDropzone
          onFiles={onIngestFiles}
          disabled={isPending}
          className="space-y-4 xl:grid xl:grid-cols-2 xl:gap-6 xl:space-y-0"
          testId="in-thread-compare-dropzone"
        >
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

          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <FileAttachmentPicker
                selectedFileIds={selectedFileIds}
                onChange={onSelectedFileIdsChange}
                disabled={isPending}
                ingestFiles={onIngestFiles}
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
              {/* The toggle's triggers are fixed-width by viewport breakpoint,
                  but this panel's column is ~350px even on desktop, so they
                  poked past the dialog edge. Bounded + sideways scroll is the
                  same answer the chat toolbar uses. */}
              {allowResearchMode ? (
                <div
                  data-testid="in-thread-compare-research"
                  className="max-w-full min-w-0 overflow-x-auto"
                >
                  <ResearchToggle
                    value={research}
                    providers={researchProviders}
                    isProvidersLoading={isResearchProvidersLoading}
                    onChange={onResearchChange}
                    disabled={isPending}
                  />
                </div>
              ) : null}
            </div>

            <ComposerAttachmentTray {...attachmentTray} />
            <ComposerAttachmentChips {...attachmentChips} />
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
                allowEmptySubmit={selectedFileIds.length > 0}
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
          </div>
        </ComposerDropzone>
      </DialogContent>
    </Dialog>
  );
}
