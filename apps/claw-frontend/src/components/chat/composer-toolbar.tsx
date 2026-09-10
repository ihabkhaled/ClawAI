import { CreditIndicator } from '@/components/chat/credit-indicator';
import { FileAttachmentPicker } from '@/components/chat/file-attachment-picker';
import { ModelSelector } from '@/components/chat/model-selector';
import { PreviewContextButton } from '@/components/chat/preview-context-button';
import { ResearchToggle } from '@/components/chat/research-toggle';
import type { ComposerToolbarProps } from '@/types';

/**
 * The quiet row under the composer's textarea: which model answers, what is
 * attached, whether the web is searched, what context will be sent, and what
 * the wallet holds.
 *
 * Pure render. Every decision — which variant each control takes, whether the
 * credit badge is shown at all — is made in useMessageComposer, so this file
 * calls no hooks.
 *
 * The row scrolls sideways rather than wrapping. Wrapping was the old
 * behaviour and it silently doubled the composer's height the moment a
 * provider name grew, which is exactly the failure this redesign exists to
 * remove: the conversation must never lose a line because a label got longer.
 *
 * `scrollbar-none` because the overflow is usually a couple of pixels and a
 * classic scrollbar is 15px tall — it drew a grey bar across the composer card
 * to report less overflow than it occupied. Every control here has a keyboard
 * tab stop, so hiding the bar hides an affordance, not access.
 */
export function ComposerToolbar({
  selectedModel,
  onModelChange,
  disabled,
  controlVariant,
  showModelLabel,
  selectedFileIds,
  onSelectedFileIdsChange,
  canResearch,
  research,
  onResearchChange,
  researchProviders,
  isResearchProvidersLoading,
  threadId,
  draft,
  showCredit,
}: ComposerToolbarProps): React.ReactElement {
  return (
    <div className="flex min-w-0 flex-1 scrollbar-none items-center gap-1.5 overflow-x-auto py-0.5 sm:gap-2">
      <ModelSelector
        value={selectedModel}
        onChange={onModelChange}
        disabled={disabled}
        variant={controlVariant}
        showLabel={showModelLabel}
      />
      <FileAttachmentPicker
        selectedFileIds={selectedFileIds}
        onChange={onSelectedFileIdsChange}
        disabled={disabled}
        variant={controlVariant}
      />
      {canResearch ? (
        <ResearchToggle
          value={research}
          providers={researchProviders}
          isProvidersLoading={isResearchProvidersLoading}
          onChange={onResearchChange}
          disabled={disabled}
        />
      ) : null}
      {threadId !== null ? (
        <div className="shrink-0">
          <PreviewContextButton threadId={threadId} draft={draft} />
        </div>
      ) : null}
      {/* Renders nothing when the account is not metered, so an admin or a
          disabled kill switch sees the composer exactly as before. */}
      {showCredit ? <CreditIndicator /> : null}
    </div>
  );
}
