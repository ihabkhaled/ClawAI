'use client';

import { ArrowLeft, Gavel, GitCompareArrows, Search } from 'lucide-react';
import Link from 'next/link';

import { ChatThreadHeaderMenu } from '@/components/chat/chat-thread-header-menu';
import { EditableTitle } from '@/components/chat/editable-title';
import { InThreadComparePanel } from '@/components/chat/in-thread-compare-panel';
import { MessageComposer } from '@/components/chat/message-composer';
import { ThreadListDrawer } from '@/components/chat/thread-list-drawer';
import { ThreadQualityPanel } from '@/components/chat/thread-quality-panel';
import { ThreadSearchPanel } from '@/components/chat/thread-search-panel';
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
//
// Layout contract (docs/05-frontend/chat-surface-layout.md):
//
//   header      shrink-0, one row, sticky
//   conversation flex-1 min-h-0 overflow-hidden — takes all remaining height
//   composer    shrink-0, sized by its own content, never fixed
//
// The conversation is the only element that grows. Nothing here sets a pixel
// height on anything, which is what makes the page correct at 375px and at
// 2560px without a breakpoint per size.
export function ChatThreadShell(props: ChatThreadShellProps): React.ReactElement {
  if (props.isLoadingPlaceholder) {
    return <LoadingSpinner label={props.loadingLabel} />;
  }
  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Sticky top header — frosted glass + safe-top inset on mobile so it
          sits below the iOS notch / Android status bar without overlap.
          One row at every width: the title truncates and the low-priority
          actions live in the overflow menu, so nothing wraps.

          The glass bleeds the full width of the page while its CONTENTS take
          the same bounded column as the conversation. Two elements, because
          they answer different questions: the frosted band belongs to the page
          edge, the title belongs over the first message. Letting the contents
          bleed too left the title at x=320 above a conversation starting at
          x=545 on a 1920px monitor — aligned with nothing. */}
      <div className="surface-glass safe-top safe-top-base-header sticky top-0 z-20 -mx-3 mb-2 shrink-0 px-3 pb-2 sm:-mx-4 sm:mb-3 sm:rounded-none sm:px-4">
        <div className="chat-content-column mx-auto flex w-full items-center gap-1.5 sm:gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            className="shrink-0"
            aria-label={props.backToThreadsLabel}
            asChild
          >
            <Link href={props.backToThreadsHref}>
              <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
            </Link>
          </Button>
          <ThreadListDrawer label={props.threadListDrawerLabel} />
          <div className="min-w-0 flex-1">
            <EditableTitle title={props.title} editableTitle={props.editableTitle} />
            {props.thread ? (
              <p className="text-muted-foreground truncate text-[11px] leading-tight">
                {props.thread.routingMode}
                {/* Only show the last-model meta on sm+ — on mobile the title
                  truncation already eats most of the row width. */}
                {props.thread.lastModel ? (
                  <span className="hidden sm:inline">{` · ${props.thread.lastModel}`}</span>
                ) : null}
              </p>
            ) : null}
          </div>

          {/* Direct actions, on a row wide enough to hold them. Below `sm` they
            move into the overflow menu instead — see ChatThreadHeaderMenu for
            the measurement that forced it. Icon-only up to `lg` so four of them
            plus the menu still fit a 1024px tablet on one row; the label
            appears once there is room for it. */}
          <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
            {props.showInlineActions ? (
              <>
                {props.canCompare ? (
                  <Button
                    variant={props.compareIsOpen ? 'default' : 'ghost'}
                    size="icon-sm"
                    className="lg:size-auto lg:h-8 lg:w-auto lg:px-2.5"
                    onClick={props.compareToggleOpen}
                    aria-label={props.compareLabel}
                    title={props.compareLabel}
                  >
                    <GitCompareArrows className="h-4 w-4 lg:me-1.5" />
                    <span className="hidden lg:inline">{props.compareLabel}</span>
                  </Button>
                ) : null}
                {props.canUseQualityControls ? (
                  <Button
                    variant={props.qualityControlsOpen ? 'default' : 'ghost'}
                    size="icon-sm"
                    className="lg:size-auto lg:h-8 lg:w-auto lg:px-2.5"
                    onClick={props.qualityControlsToggleOpen}
                    aria-label={props.qualityControlsLabel}
                    title={props.qualityControlsLabel}
                    aria-expanded={props.qualityControlsOpen}
                  >
                    <Gavel className="h-4 w-4 lg:me-1.5" />
                    <span className="hidden lg:inline">{props.qualityControlsLabel}</span>
                  </Button>
                ) : null}
                <Button
                  variant={props.search.isOpen ? 'default' : 'ghost'}
                  size="icon-sm"
                  className="lg:size-auto lg:h-8 lg:w-auto lg:px-2.5"
                  onClick={props.search.isOpen ? props.search.close : props.search.open}
                  aria-label={props.searchLabel}
                  title={props.searchLabel}
                  aria-expanded={props.search.isOpen}
                >
                  <Search className="h-4 w-4 lg:me-1.5" />
                  <span className="hidden lg:inline">{props.searchLabel}</span>
                </Button>
                <ShareChatButton {...props.shareButtonProps} />
              </>
            ) : null}
            <ChatThreadHeaderMenu {...props.headerMenuProps} />
          </div>
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

      {/* The reading column. Bounded and centred so a line of prose stays
          legible on a 2560px monitor; the bound is wide enough that it never
          binds on a 1366px laptop, so no gutter appears where there is no room
          to spare. The composer shares the bound so the two stay aligned. */}
      <div className="chat-content-column mx-auto flex min-h-0 w-full flex-1 flex-col gap-2 sm:gap-3">
        <div className="min-h-0 flex-1 overflow-hidden rounded-xl border">
          <ThreadSearchPanel search={props.search} onJumpToMessage={props.onJumpToMessage} />
          <VirtualizedMessages {...props.virtualizedMessagesProps} />
        </div>

        <MessageComposer {...props.composerProps} />
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
