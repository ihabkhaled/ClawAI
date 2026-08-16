'use client';

import { ArrowLeft, Gavel, GitCompareArrows, Settings, Trash2 } from 'lucide-react';
import Link from 'next/link';

import { EditableTitle } from '@/components/chat/editable-title';
import { InThreadComparePanel } from '@/components/chat/in-thread-compare-panel';
import { MessageComposer } from '@/components/chat/message-composer';
import { ThreadQualityPanel } from '@/components/chat/thread-quality-panel';
import { ThreadSettings } from '@/components/chat/thread-settings';
import { VirtualizedMessages } from '@/components/chat/virtualized-messages';
import { ShareChatButton } from '@/components/chat-shares/share-chat-button';
import { ShareChatDialog } from '@/components/chat-shares/share-chat-dialog';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { Button } from '@/components/ui/button';
import type { ChatThreadShellProps } from '@/types';

// Pure-render shell for /chat/[threadId]. ZERO hook calls. Every piece of
// state and every callback arrives via props built by useThreadDetailPage.
export function ChatThreadShell(props: ChatThreadShellProps): React.ReactElement {
  if (props.isLoadingPlaceholder) {
    return <LoadingSpinner label={props.loadingLabel} />;
  }
  return (
    <div className="flex h-full flex-col">
      {/* Sticky top header — frosted glass + safe-top inset on mobile so it
          sits below the iOS notch / Android status bar without overlap. */}
      {/* Asymmetric vertical padding: more above than below. The header sits
          directly under the portal's own top border, and equal padding left the
          title reading as if it were glued to that line. The extra top space
          separates the two without pushing the whole conversation down. */}
      <div className="surface-glass safe-top safe-top-base-header sticky top-0 z-20 -mx-3 mb-3 flex flex-col gap-3 px-3 pb-3 sm:-mx-4 sm:mb-4 sm:flex-row sm:items-center sm:justify-between sm:rounded-none sm:px-4 sm:pb-4">
        <div className="flex min-w-0 items-center gap-2">
          {/* Mobile: icon-only back button at the start of the header.
              Desktop: appears as labeled button in the actions cluster. */}
          <Button
            variant="ghost"
            size="icon-sm"
            className="shrink-0 sm:hidden"
            aria-label={props.backToThreadsLabel}
            asChild
          >
            <Link href={props.backToThreadsHref}>
              <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
            </Link>
          </Button>
          <div className="min-w-0 flex-1">
            <EditableTitle title={props.title} editableTitle={props.editableTitle} />
            {props.thread ? (
              <p className="text-muted-foreground mt-0.5 truncate text-xs sm:mt-1 sm:text-sm">
                {props.thread.routingMode}
                {/* Only show the last-model meta on sm+ — on mobile the title
                    truncation already eats most of the row width. */}
                {props.thread.lastModel ? (
                  <span className="hidden sm:inline">{` · ${props.thread.lastModel}`}</span>
                ) : null}
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          {props.canCompare ? (
            <Button
              variant={props.compareIsOpen ? 'default' : 'ghost'}
              size="icon-sm"
              className="sm:size-auto sm:h-9 sm:w-auto sm:px-3"
              onClick={props.compareToggleOpen}
              aria-label={props.compareLabel}
            >
              <GitCompareArrows className="h-4 w-4 sm:me-2" />
              <span className="hidden sm:inline">{props.compareLabel}</span>
            </Button>
          ) : null}
          {props.canUseQualityControls ? (
            <Button
              variant={props.qualityControlsOpen ? 'default' : 'ghost'}
              size="icon-sm"
              className="sm:size-auto sm:h-9 sm:w-auto sm:px-3"
              onClick={props.qualityControlsToggleOpen}
              aria-label={props.qualityControlsLabel}
              aria-expanded={props.qualityControlsOpen}
            >
              <Gavel className="h-4 w-4 sm:me-2" />
              <span className="hidden sm:inline">{props.qualityControlsLabel}</span>
            </Button>
          ) : null}
          <ShareChatButton {...props.shareButtonProps} />
          <Button
            variant={props.threadSettingsOpen ? 'default' : 'ghost'}
            size="icon-sm"
            className="sm:size-auto sm:h-9 sm:w-auto sm:px-3"
            onClick={props.threadSettingsToggleOpen}
            aria-label={props.threadSettingsLabel}
            aria-expanded={props.threadSettingsOpen}
          >
            <Settings className="h-4 w-4 sm:me-2" />
            <span className="hidden sm:inline">{props.threadSettingsLabel}</span>
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-destructive hover:text-destructive sm:size-auto sm:h-9 sm:w-auto sm:px-3"
            onClick={props.openDeleteConfirm}
            disabled={props.isDeleting}
            aria-label={props.deleteLabel}
          >
            <Trash2 className="h-4 w-4 sm:me-2" />
            <span className="hidden sm:inline">{props.deleteLabel}</span>
          </Button>
          {/* Desktop-only labeled back button — mobile uses the icon-only one
              positioned next to the title above. */}
          <Button variant="outline" size="sm" className="hidden sm:inline-flex" asChild>
            <Link href={props.backToThreadsHref}>
              <ArrowLeft className="h-4 w-4 sm:me-2 rtl:rotate-180" />
              <span>{props.backToThreadsLabel}</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Compare Models / Judge & Referee / Thread Settings are dialogs, not
          inline panels — they overlay the chat instead of hiding the message
          history and composer behind them. useThreadDetailPage's activePanel
          state keeps at most one open at a time. */}
      {props.canCompare ? <InThreadComparePanel {...props.inThreadComparePanelProps} /> : null}

      {props.canUseQualityControls ? (
        <ThreadQualityPanel {...props.threadQualityPanelProps} />
      ) : null}

      <ThreadSettings {...props.threadSettingsProps} />

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border">
        <div className="min-h-0 flex-1 overflow-hidden">
          <VirtualizedMessages {...props.virtualizedMessagesProps} />
        </div>

        <div
          className="relative shrink-0 border-t md:h-[var(--composer-h)]"
          style={{ '--composer-h': `${props.composerHeight}px` } as React.CSSProperties}
        >
          {/* Drag-to-resize is a pointer affordance — hidden on touch/mobile
              where the composer is natural-height and the gesture has no effect. */}
          <Button
            variant="unstyled"
            size="unstyled"
            type="button"
            aria-label={props.resizeAriaLabel}
            className="hover:bg-muted/50 absolute inset-x-0 top-0 z-10 hidden h-3 cursor-ns-resize items-center justify-center md:flex"
            onMouseDown={props.onResizeHandleMouseDown}
          >
            <div className="bg-muted-foreground/30 h-1 w-10 rounded-full" />
          </Button>
          <div className="flex flex-col p-3 pt-3 sm:p-4 md:h-full">
            <MessageComposer {...props.composerProps} />
          </div>
        </div>
      </div>

      <ShareChatDialog {...props.shareDialogProps} />

      <ConfirmDialog
        open={props.deleteConfirmOpen}
        onOpenChange={props.setDeleteConfirmOpen}
        title={props.deleteConfirmTitle}
        description={props.deleteConfirmDescription}
        confirmLabel={props.deleteLabel}
        cancelLabel={props.cancelLabel}
        onConfirm={props.handleDelete}
        isConfirming={props.isDeleting}
        destructive
      />
    </div>
  );
}
