import { CheckCircle, Loader2, Play, X } from 'lucide-react';

import { CompareCriticControls } from '@/components/chat/compare-critic-controls';
import { CompareJudgeControls } from '@/components/chat/compare-judge-controls';
import { CompareResearchModeControl } from '@/components/chat/compare-research-mode-control';
import { ComposerDropzone } from '@/components/chat/composer-dropzone';
import { FileAttachmentPicker } from '@/components/chat/file-attachment-picker';
import { ParallelModelSelector } from '@/components/chat/parallel-model-selector';
import { RichPromptTextarea } from '@/components/chat/rich-prompt-textarea';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { InThreadComparePanelProps } from '@/types';

export function InThreadComparePanel({
  selectedModels,
  onToggleModel,
  prompt,
  onPromptChange,
  onSend,
  onClose,
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
  researchMode,
  onResearchModeChange,
  allowJudgeMode,
  allowCriticReview,
  allowResearchMode,
  selectedFileIds,
  onSelectedFileIdsChange,
  onIngestFiles,
  t,
}: InThreadComparePanelProps): React.ReactElement {
  return (
    <Card className="mb-4">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          {t('compare.title')}
          <Badge variant="secondary" className="text-xs">
            {selectedModels.length} {t('nav.models')}
          </Badge>
        </CardTitle>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4 xl:grid xl:grid-cols-2 xl:gap-6 xl:space-y-0">
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

          {allowResearchMode ? (
            <CompareResearchModeControl
              value={researchMode}
              onChange={onResearchModeChange}
              t={t}
            />
          ) : null}
        </div>

        <ComposerDropzone onFiles={onIngestFiles} disabled={isPending} className="space-y-4">
          <div className="flex items-center gap-2">
            <FileAttachmentPicker
              selectedFileIds={selectedFileIds}
              onChange={onSelectedFileIdsChange}
              disabled={isPending}
            />
          </div>

          <form
            className="flex items-end gap-2"
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
              className="flex-1"
            />
            <Button type="submit" disabled={!canSend || isPending} size="sm">
              {isPending ? (
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
              ) : (
                <Play className="me-2 h-4 w-4" />
              )}
              {isPending ? t('compare.comparing') : t('compare.sendPrompt')}
            </Button>
          </form>

          {result ? (
            <div className="flex items-center gap-2 rounded-md bg-muted p-3 text-sm">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-muted-foreground">
                {t('compare.processingMessage', { count: selectedModels.length })}
              </span>
            </div>
          ) : null}
        </ComposerDropzone>
      </CardContent>
    </Card>
  );
}
