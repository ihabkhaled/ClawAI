import { Send } from 'lucide-react';

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
  } = useMessageComposerState({ onSend, isPending, selectedModel });

  const hasContent = content.trim().length > 0;
  const canSubmit = !isPending && hasContent;

  // Phase 2 mobile composer redesign (spec §2.4):
  //   Mobile (<md): two-row stacked layout — top row holds the compact
  //   ModelSelector + ResearchToggle + PreviewContextButton; bottom row is the
  //   FileAttachmentPicker (compact) + Textarea (with absolute Send button).
  //   Desktop (md+): keeps the historical toolbar-row-above-textarea layout.
  //
  // The textarea container is a relatively-positioned wrapper so the Send
  // button can sit absolutely inside the bottom-right of the textarea field
  // on mobile, and the same wrapper also clamps max-height via the CSS vars
  // --composer-max-height-{mobile,desktop}.
  return (
    <form
      onSubmit={handleSubmit}
      className="safe-bottom flex h-full min-h-0 flex-col gap-1.5"
    >
      {/* Mobile top row — compact model + research + preview. */}
      <div className="flex shrink-0 items-center gap-2 overflow-x-auto pb-0.5 md:hidden [&>*]:shrink-0">
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
        {threadId ? <PreviewContextButton threadId={threadId} draft={content} /> : null}
      </div>

      {/* Desktop toolbar row — keeps the historical single-row layout at md+. */}
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

      {/* Bottom row — mobile = attach + textarea + absolute send; desktop = textarea + side send. */}
      {/* Desktop uses items-stretch so the textarea wrapper fills the vertical
          space granted by the parent panel's drag handle. Mobile keeps
          items-end so the absolute Send button anchors to the textarea's bottom. */}
      <div className="flex min-h-0 flex-1 items-end gap-2 md:items-stretch">
        {/* Mobile-only compact file picker sitting beside the textarea. */}
        <div className="md:hidden">
          <FileAttachmentPicker
            selectedFileIds={selectedFileIds}
            onChange={setSelectedFileIds}
            disabled={isPending}
            variant={ComposerControlVariant.Compact}
          />
        </div>

        {/* Mobile keeps composer-max-height (50dvh cap so the keyboard has room);
            desktop removes it so the textarea grows with the drag-resized panel. */}
        <div className="composer-max-height relative min-h-0 flex-1 md:!max-h-none">
          <Textarea
            value={content}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={t('chat.composerPlaceholder')}
            className={cn(
              // Mobile-first styling per spec: rounded-2xl panel surface with a
              // soft border, then the focus ring tightens to a 1px primary ring.
              'composer-max-height min-h-[60px] w-full resize-none rounded-2xl border-border/50 bg-card pr-12 text-[15px]',
              'transition-colors focus-visible:border-primary/50 focus-visible:ring-1 focus-visible:ring-primary/20 focus-visible:ring-offset-0',
              // At md+ the wrapper stretches via flex; the textarea fills it via
              // h-full and we drop both the min-h floor and the 50dvh max cap so
              // the panel's drag handle is the sole height authority.
              'md:!max-h-none md:h-full md:min-h-0',
            )}
            disabled={isPending}
          />
          {/* Mobile send button — absolute inside the textarea container. */}
          <Button
            type="submit"
            size="icon"
            aria-label={t('chat.sendMessage')}
            className={cn(
              'absolute bottom-2 right-2 h-8 w-8 rounded-xl shadow-soft md:hidden',
              'transition-all duration-fast hover:scale-105 active:scale-95',
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

        {/* Desktop send button — historical side-by-side placement at md+. */}
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

      {validationError ? <p className="mt-1 text-sm text-destructive">{validationError}</p> : null}
    </form>
  );
}
