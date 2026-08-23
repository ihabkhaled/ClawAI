import { Send } from 'lucide-react';

import { ComposerDropzone } from '@/components/chat/composer-dropzone';
import { FileAttachmentPicker } from '@/components/chat/file-attachment-picker';
import { ModelSelector } from '@/components/chat/model-selector';
import { PreviewContextButton } from '@/components/chat/preview-context-button';
import { ResearchToggle } from '@/components/chat/research-toggle';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ComposerControlVariant, PlanFeature } from '@/enums';
import { usePlanFeatures } from '@/hooks/auth/use-plan-features';
import { useMessageComposerState } from '@/hooks/chat/use-message-composer-state';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { MessageComposerProps } from '@/types';

export function MessageComposer({
  onSend,
  isPending,
  selectedModel,
  onModelChange,
  threadId,
}: MessageComposerProps): React.ReactElement {
  const { t } = useTranslation();
  const planFeatures = usePlanFeatures();
  const canResearch = planFeatures.has(PlanFeature.ALLOW_RESEARCH_MODE);
  const {
    content,
    validationError,
    selectedFileIds,
    setSelectedFileIds,
    research,
    setResearch,
    researchProviders,
    isResearchProvidersLoading,
    handleSubmit,
    handleKeyDown,
    handleChange,
    ingestFiles,
    isUploadingAttachment,
  } = useMessageComposerState({ onSend, isPending, selectedModel });

  const hasContent = content.trim().length > 0;
  const canSubmit = !isPending && hasContent;

  return (
    <ComposerDropzone
      onFiles={ingestFiles}
      disabled={isPending}
      className="safe-bottom flex h-full min-h-0 flex-col"
    >
      <form onSubmit={handleSubmit} className="flex h-full min-h-0 flex-col gap-1.5">
        {/* `[&>*]:shrink-0` used to sit here and outranked each control's own
            sizing, so nothing could give: a long provider name pushed the row
            off the screen instead of clipping. The square buttons hold their
            size themselves; the research control is the one that shrinks. */}
        <div className="flex shrink-0 flex-wrap items-center gap-2 pb-1 md:hidden">
          <ModelSelector
            value={selectedModel}
            onChange={onModelChange}
            disabled={isPending}
            variant={ComposerControlVariant.Compact}
          />
          {canResearch ? (
            <ResearchToggle
              value={research}
              providers={researchProviders}
              isProvidersLoading={isResearchProvidersLoading}
              onChange={setResearch}
              disabled={isPending}
            />
          ) : null}
          {threadId ? (
            <div className="shrink-0">
              <PreviewContextButton threadId={threadId} draft={content} />
            </div>
          ) : null}
        </div>

        <div className="hidden shrink-0 items-center gap-2 pb-1 md:flex md:flex-wrap [&>*]:shrink-0">
          <ModelSelector value={selectedModel} onChange={onModelChange} disabled={isPending} />
          <FileAttachmentPicker
            selectedFileIds={selectedFileIds}
            onChange={setSelectedFileIds}
            disabled={isPending}
          />
          {canResearch ? (
            <ResearchToggle
              value={research}
              providers={researchProviders}
              isProvidersLoading={isResearchProvidersLoading}
              onChange={setResearch}
              disabled={isPending}
            />
          ) : null}
          {threadId ? <PreviewContextButton threadId={threadId} draft={content} /> : null}
        </div>

        <div className="flex min-h-0 flex-1 items-end gap-2 md:items-stretch">
          <div className="md:hidden">
            <FileAttachmentPicker
              selectedFileIds={selectedFileIds}
              onChange={setSelectedFileIds}
              disabled={isPending}
              variant={ComposerControlVariant.Compact}
            />
          </div>

          <div className="composer-max-height relative min-h-0 flex-1 md:!max-h-none">
            <Textarea
              value={content}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder={t('chat.composerPlaceholder')}
              className={cn(
                'composer-max-height border-border/50 bg-card min-h-[60px] w-full resize-none rounded-2xl pe-14 text-base',
                'focus-visible:border-primary/50 focus-visible:ring-primary/20 transition-colors focus-visible:ring-1 focus-visible:ring-offset-0',
                'md:h-full md:!max-h-none md:min-h-0 md:pe-3 md:text-sm',
              )}
              disabled={isPending}
            />
            <Button
              type="submit"
              size="icon"
              aria-label={t('chat.sendMessage')}
              className={cn(
                'shadow-soft absolute end-2 bottom-2 h-11 w-11 rounded-xl md:hidden',
                'duration-fast transition-all hover:scale-105 active:scale-95',
                canSubmit
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'bg-muted text-muted-foreground hover:bg-muted',
              )}
              disabled={!canSubmit}
            >
              <Send className="h-4 w-4" />
              <span className="sr-only">{t('chat.sendMessage')}</span>
            </Button>
          </div>

          <Button
            type="submit"
            size="icon"
            className="hidden min-h-11 min-w-11 shrink-0 self-end md:inline-flex"
            disabled={!canSubmit}
          >
            <Send className="h-4 w-4" />
            <span className="sr-only">{t('chat.sendMessage')}</span>
          </Button>
        </div>

        {validationError ? (
          <p className="text-destructive mt-1 text-sm">{validationError}</p>
        ) : null}
        {isUploadingAttachment ? (
          <p className="text-muted-foreground mt-1 text-xs" aria-live="polite">
            {t('chat.attachment.uploading')}
          </p>
        ) : null}
      </form>
    </ComposerDropzone>
  );
}
