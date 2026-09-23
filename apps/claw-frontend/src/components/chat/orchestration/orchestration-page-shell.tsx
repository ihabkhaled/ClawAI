import { Sparkles } from 'lucide-react';

import { ComposerDropzone } from '@/components/chat/composer-dropzone';
import { FileAttachmentPicker } from '@/components/chat/file-attachment-picker';
import { OrchestrationPageHeader } from '@/components/chat/orchestration/orchestration-page-header';
import { OrchestrationSingleModelSelect } from '@/components/chat/orchestration/orchestration-single-model-select';
import { OrchestrationStageTimeline } from '@/components/chat/orchestration/orchestration-stage-timeline';
import { ResearchToggle } from '@/components/chat/research-toggle';
import { RichPromptTextarea } from '@/components/chat/rich-prompt-textarea';
import { VoiceVideoRecorder } from '@/components/chat/voice-video-recorder';
import { LoadingState } from '@/components/common/loading-state';
import { UploadProgressIndicator } from '@/components/files/upload-progress-indicator';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ORCHESTRATION_PROMPT_MAX_ROWS, ORCHESTRATION_PROMPT_MIN_ROWS } from '@/constants';
import { AlertVariant } from '@/enums/alert-variant.enum';
import { LoadingStateVariant } from '@/enums/loading-state.enum';
import { PlanFeature } from '@/enums/plan-feature.enum';
import { usePlanFeatures } from '@/hooks/auth/use-plan-features';
import { useModelMediaCapabilities } from '@/hooks/chat/use-model-media-capabilities';
import { cn } from '@/lib/utils';
import type { OrchestrationPageShellProps } from '@/types/orchestration.types';

// Shared shell every orchestration lab page composes around.
//
// Responsibilities:
//   1. Render the gradient hero header (icon + title + description + badge).
//   2. Stack a 2-column layout on desktop, 1-column on mobile, with the
//      input column on the left and the output column on the right.
//   3. Enforce single-model selection — the submit button is disabled
//      until `selectedModel !== null` AND `prompt.trim().length > 0`
//      (plus any per-page `isSubmitDisabled` host gate).
//   4. Manage the four output states:
//      a. live progress (RuntimeProgressPanel + OrchestrationStageTimeline)
//      b. loading skeleton (when isPending && !hasProgress)
//      c. result slot (the host page's result card)
//      d. empty slot (initial state before submission)
//   5. Surface back-end errors via the Alert primitive (variant=Error).
//
// The container is `flex h-full min-h-0 flex-col` with `overflow-y-auto`
// on the scrolling body, which fixes the scroll-overflow class of bug
// that has bitten the orchestration pages historically.
export function OrchestrationPageShell({
  headerIcon,
  headerTitle,
  headerDescription,
  headerBadge,
  selectedModel,
  composer,
  onModelChange,
  prompt,
  onPromptChange,
  promptPlaceholder,
  promptLabel,
  extraFieldsSlot,
  onSubmit,
  submitLabel,
  isSubmitDisabled,
  isPending,
  hasProgress,
  stages,
  resultSlot,
  emptySlot,
  errorMessage,
  t,
  className,
}: OrchestrationPageShellProps): React.ReactElement {
  const mediaCapabilities = useModelMediaCapabilities(selectedModel);
  // Same gate as the chat composer (use-message-composer.ts): research is a
  // paid feature, and a lab is not an exception to that.
  const planFeatures = usePlanFeatures();
  const canResearch = planFeatures.has(PlanFeature.ALLOW_RESEARCH_MODE);
  const trimmedPrompt = prompt.trim();
  const canSubmit =
    !isPending && selectedModel !== null && trimmedPrompt.length > 0 && isSubmitDisabled !== true;

  const hasError = errorMessage !== undefined && errorMessage !== null && errorMessage !== '';
  const hasResult = resultSlot !== undefined && resultSlot !== null && !isPending && !hasError;
  const showEmpty = !isPending && !hasError && !hasResult;
  const showSkeleton = isPending && !hasProgress;
  const showProgress = isPending && hasProgress;

  const resolvedPromptLabel = promptLabel ?? t('orchestrationShell.promptLabel');
  const resolvedPromptPlaceholder = promptPlaceholder ?? t('orchestrationShell.promptPlaceholder');

  return (
    <div className={cn('flex h-full min-h-0 flex-col', className)}>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 sm:px-6">
        <OrchestrationPageHeader
          icon={headerIcon}
          title={headerTitle}
          description={headerDescription}
          badge={headerBadge}
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] md:gap-6">
          {/* ─── Input column ────────────────────────────────────── */}
          <section
            aria-label={t('orchestrationShell.inputColumnLabel')}
            className="flex flex-col gap-3"
          >
            <Card>
              <CardContent className="space-y-4 p-4 sm:p-5">
                <OrchestrationSingleModelSelect
                  value={selectedModel}
                  onChange={onModelChange}
                  disabled={isPending}
                  t={t}
                />

                <div className="space-y-2">
                  <label
                    htmlFor="orchestration-prompt"
                    className="text-foreground block text-sm font-medium"
                  >
                    {resolvedPromptLabel}
                  </label>
                  {/* Attachments live in the shell, not in nine pages. Until
                      now only Compare had them, so whether you could hand a
                      model a document depended on which lab you opened. A page
                      that passes no composer renders exactly as before. */}
                  {/* RichPromptTextarea, not a bare Textarea: the labs used a
                      fixed `rows={6}` box with no Enter-to-send and no IME
                      guard, so typing a long prompt scrolled inside six rows
                      and a CJK composition could not be confirmed safely. It
                      is the same component chat and compare already use. */}
                  {composer === undefined ? (
                    <RichPromptTextarea
                      id="orchestration-prompt"
                      value={prompt}
                      onChange={onPromptChange}
                      onSubmit={canSubmit ? onSubmit : undefined}
                      placeholder={resolvedPromptPlaceholder}
                      disabled={isPending}
                      minRows={ORCHESTRATION_PROMPT_MIN_ROWS}
                      maxRows={ORCHESTRATION_PROMPT_MAX_ROWS}
                      className="min-h-[8rem]"
                    />
                  ) : (
                    <ComposerDropzone onFiles={composer.ingestFiles} disabled={isPending}>
                      <RichPromptTextarea
                        id="orchestration-prompt"
                        value={prompt}
                        onChange={onPromptChange}
                        onSubmit={canSubmit ? onSubmit : undefined}
                        placeholder={resolvedPromptPlaceholder}
                        disabled={isPending}
                        minRows={ORCHESTRATION_PROMPT_MIN_ROWS}
                        maxRows={ORCHESTRATION_PROMPT_MAX_ROWS}
                        className="min-h-[8rem]"
                      />
                    </ComposerDropzone>
                  )}
                </div>

                {composer === undefined ? null : (
                  <div
                    data-testid="orchestration-attachments"
                    className="flex flex-wrap items-center gap-2"
                  >
                    <FileAttachmentPicker
                      selectedFileIds={composer.selectedFileIds}
                      onChange={composer.setSelectedFileIds}
                      disabled={isPending}
                    />
                    {/* One wiring here gives all nine lab pages voice and video
                        notes, exactly as it did attachments. */}
                    <VoiceVideoRecorder
                      canSendAudio={mediaCapabilities.canSendAudio}
                      canSendVideo={mediaCapabilities.canSendVideo}
                      onRecorded={(file) => composer.ingestFiles([file])}
                      disabled={isPending}
                    />
                    {/* The whole web-research path existed on the backend for
                        every lab — DTO field, manager enrichment, plan gate —
                        and never ran once, because no lab page ever put
                        `researchMode` on a payload. This control is the
                        missing link, and it is the same component the chat
                        composer renders. */}
                    {canResearch ? (
                      <ResearchToggle
                        value={composer.research}
                        providers={composer.researchProviders}
                        isProvidersLoading={composer.isResearchProvidersLoading}
                        onChange={composer.setResearch}
                        disabled={isPending}
                      />
                    ) : null}
                  </div>
                )}

                {/* An upload runs in the background after a paste or a drop,
                    and until now the labs said nothing while it did — a large
                    file looked like nothing had happened, so people dropped it
                    again. The count is a bare number on purpose: it needs no
                    translation and avoids a 14th copy of the same sentence. */}
                {composer !== undefined && composer.isUploading ? (
                  <p
                    data-testid="orchestration-upload-status"
                    aria-live="polite"
                    className="text-muted-foreground text-xs"
                  >
                    {t('chat.attachment.uploading')}
                    {composer.pendingCount > 0 ? ` (${String(composer.pendingCount)})` : ''}
                  </p>
                ) : null}

                {composer !== undefined && composer.progress !== null ? (
                  <UploadProgressIndicator progress={composer.progress} />
                ) : null}

                {extraFieldsSlot !== undefined && extraFieldsSlot !== null ? (
                  <div className="space-y-3">{extraFieldsSlot}</div>
                ) : null}

                <Button type="button" onClick={onSubmit} disabled={!canSubmit} className="w-full">
                  {submitLabel}
                </Button>

                {selectedModel === null ? (
                  <p className="text-muted-foreground text-xs">
                    {t('orchestrationShell.pickModelHint')}
                  </p>
                ) : null}
              </CardContent>
            </Card>
          </section>

          {/* ─── Output column ───────────────────────────────────── */}
          <section
            aria-label={t('orchestrationShell.outputColumnLabel')}
            aria-live="polite"
            aria-atomic="false"
            className="flex flex-col gap-3"
          >
            {showSkeleton ? (
              <Card>
                <CardContent className="space-y-3 p-4 sm:p-5">
                  <LoadingState
                    variant={LoadingStateVariant.Card}
                    rows={1}
                    label={t('orchestrationShell.runningLabel')}
                  />
                  <p className="text-muted-foreground text-center text-xs">
                    {t('orchestrationShell.runningLabel')}
                  </p>
                </CardContent>
              </Card>
            ) : null}

            {showProgress ? (
              <Card>
                <CardContent className="space-y-4 p-4 sm:p-5">
                  <div className="text-primary flex items-center gap-2 text-xs font-semibold tracking-[0.18em] uppercase">
                    <Sparkles className="h-3.5 w-3.5" />
                    {t('orchestrationShell.progressTitle')}
                  </div>
                  <OrchestrationStageTimeline stages={stages} t={t} />
                </CardContent>
              </Card>
            ) : null}

            {hasError ? (
              <Alert
                variant={AlertVariant.Error}
                title={t('orchestrationShell.errorTitle')}
                description={errorMessage ?? ''}
              />
            ) : null}

            {hasResult ? <div className="space-y-3">{resultSlot}</div> : null}

            {showEmpty ? <div>{emptySlot}</div> : null}
          </section>
        </div>
      </div>
    </div>
  );
}
