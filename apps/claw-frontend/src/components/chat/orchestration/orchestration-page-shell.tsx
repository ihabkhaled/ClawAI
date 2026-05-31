import { Sparkles } from 'lucide-react';

import { OrchestrationPageHeader } from '@/components/chat/orchestration/orchestration-page-header';
import { OrchestrationSingleModelSelect } from '@/components/chat/orchestration/orchestration-single-model-select';
import { OrchestrationStageTimeline } from '@/components/chat/orchestration/orchestration-stage-timeline';
import { LoadingState } from '@/components/common/loading-state';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { AlertVariant } from '@/enums/alert-variant.enum';
import { LoadingStateVariant } from '@/enums/loading-state.enum';
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
  const trimmedPrompt = prompt.trim();
  const canSubmit =
    !isPending &&
    selectedModel !== null &&
    trimmedPrompt.length > 0 &&
    isSubmitDisabled !== true;

  const hasError = errorMessage !== undefined && errorMessage !== null && errorMessage !== '';
  const hasResult = resultSlot !== undefined && resultSlot !== null && !isPending && !hasError;
  const showEmpty = !isPending && !hasError && !hasResult;
  const showSkeleton = isPending && !hasProgress;
  const showProgress = isPending && hasProgress;

  const resolvedPromptLabel = promptLabel ?? t('orchestrationShell.promptLabel');
  const resolvedPromptPlaceholder =
    promptPlaceholder ?? t('orchestrationShell.promptPlaceholder');

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
                    className="block text-sm font-medium text-foreground"
                  >
                    {resolvedPromptLabel}
                  </label>
                  <Textarea
                    id="orchestration-prompt"
                    value={prompt}
                    onChange={(event) => onPromptChange(event.target.value)}
                    placeholder={resolvedPromptPlaceholder}
                    disabled={isPending}
                    rows={6}
                    className="min-h-[8rem]"
                  />
                </div>

                {extraFieldsSlot !== undefined && extraFieldsSlot !== null ? (
                  <div className="space-y-3">{extraFieldsSlot}</div>
                ) : null}

                <Button
                  type="button"
                  onClick={onSubmit}
                  disabled={!canSubmit}
                  className="w-full"
                >
                  {submitLabel}
                </Button>

                {selectedModel === null ? (
                  <p className="text-xs text-muted-foreground">
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
                  <p className="text-center text-xs text-muted-foreground">
                    {t('orchestrationShell.runningLabel')}
                  </p>
                </CardContent>
              </Card>
            ) : null}

            {showProgress ? (
              <Card>
                <CardContent className="space-y-4 p-4 sm:p-5">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
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
