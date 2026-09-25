'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

import { ChatPanelDropzone } from '@/components/chat/chat-panel-dropzone';
import { ChatThreadActionRail } from '@/components/chat/chat-thread-action-rail';
import { ChatThreadHeaderMenu } from '@/components/chat/chat-thread-header-menu';
import { EditableTitle } from '@/components/chat/editable-title';
import { InThreadComparePanel } from '@/components/chat/in-thread-compare-panel';
import { MessageComposer } from '@/components/chat/message-composer';
import { StreamHealthNotice } from '@/components/chat/stream-health-notice';
import { ThreadListDrawer } from '@/components/chat/thread-list-drawer';
import { ThreadQualityPanel } from '@/components/chat/thread-quality-panel';
import { ThreadSearchPanel } from '@/components/chat/thread-search-panel';
import { ThreadSettings } from '@/components/chat/thread-settings';
import { VirtualizedMessages } from '@/components/chat/virtualized-messages';
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
//   header      shrink-0, ONE LINE, sticky — the title, and nothing else
//   body row    flex-1 min-h-0, splits into the reading column and the rail
//   conversation flex-1 min-h-0 overflow-hidden — takes all remaining height
//   composer    shrink-0, sized by its own content, never fixed
//   action rail shrink-0, self-start, LAST child so it lands inline-end
//
// The conversation is the only element that grows. Nothing here sets a pixel
// height on anything, which is what makes the page correct at 375px and at
// 2560px without a breakpoint per size.
//
// The header used to be a band: a title over a routing subtitle, with five
// controls beside them. Height is the scarce resource on a conversation page
// (rule 40 §1) and that band was spending it at every scroll position. The
// controls now live in a vertical rail beside the conversation, where the cost
// is width — which the bounded reading column leaves over anyway on anything
// wider than a tablet. Nothing was dropped: below `sm`, where there is no
// gutter to put a rail in, all of it is still in the header's `…` menu.
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
      <div className="surface-glass safe-top safe-top-base-header sticky top-0 z-20 -mx-3 mb-1.5 shrink-0 px-3 pb-1.5 sm:-mx-4 sm:mb-2 sm:rounded-none sm:px-4">
        {/* `.chat-thread-row`, not `.chat-content-column`: the row is the
            reading column PLUS the rail's reserved strip, so the title starts
            at exactly the x the first message starts at. Aligning the header
            with the column alone would have offset it by half the rail. */}
        <div className="chat-thread-row mx-auto flex w-full items-center gap-1 sm:gap-2">
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
          {/* Stacked below `sm`, one line from `sm` up.
              On a phone every control on this row is floored at 44px by the
              global touch rule, so the title and its routing meta fit inside
              that floor stacked and cost nothing extra — which is why the
              second line is kept there rather than dropped. On a mouse there is
              no floor, the row is exactly as tall as this block, and the second
              line is ~14px of pure cost. It goes inline instead. */}
          <div className="flex min-w-0 flex-1 flex-col sm:flex-row sm:items-baseline sm:gap-2">
            <EditableTitle title={props.title} editableTitle={props.editableTitle} />
            {props.thread ? (
              <p className="text-muted-foreground min-w-0 truncate text-[11px] leading-tight sm:max-w-[40%]">
                {props.thread.routingMode}
                {/* Only show the last-model meta on sm+ — on mobile the title
                  truncation already eats most of the row width. */}
                {props.thread.lastModel ? (
                  <span className="hidden sm:inline">{` · ${props.thread.lastModel}`}</span>
                ) : null}
              </p>
            ) : null}
          </div>

          {/* The one control left on the header, and only where there is no
              rail to hold it. Below `sm` this menu carries all seven actions —
              see ChatThreadHeaderMenu for the 375px measurement that forced
              that, and ChatThreadActionRail for where they go above it. */}
          {props.showInlineActions ? null : (
            <div className="flex shrink-0 items-center">
              <ChatThreadHeaderMenu {...props.headerMenuProps} />
            </div>
          )}
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

      {/* The body row: the reading column, then the rail.
          A plain flex row, so the rail lands on the right in LTR and on the
          left in RTL by document order alone — no `dir` read, no `rtl:` twin of
          a physical utility to keep in step. */}
      <div className="chat-thread-row mx-auto flex min-h-0 w-full flex-1 items-stretch gap-1.5 sm:gap-2">
        {/* The reading column. Bounded and centred so a line of prose stays
            legible on a 2560px monitor; the bound is wide enough that it never
            binds on a 1366px laptop, so no gutter appears where there is no room
            to spare. The composer shares the bound so the two stay aligned. */}
        {/* `min-w-0` is load-bearing now that the column has a sibling. A flex
            item's automatic minimum size is its min-content width, and the
            transcript's min-content is wider than a 768px tablet leaves: the
            column refused to shrink and pushed the rail 50px off the right edge
            of the screen. Measured at 768x1024. */}
        {/* The whole column — messages AND composer — takes a dropped file,
            not only the textarea. The overlay covers the column while a file
            is dragged over it; the files go to the composer's own upload
            pipeline. */}
        <ChatPanelDropzone className="chat-content-column flex min-h-0 w-full min-w-0 flex-1 flex-col gap-2 sm:gap-3">
          <div className="min-h-0 flex-1 overflow-hidden rounded-xl border">
            <ThreadSearchPanel search={props.search} onJumpToMessage={props.onJumpToMessage} />
            <VirtualizedMessages {...props.virtualizedMessagesProps} />
          </div>

          {/* Between the transcript and the composer, and only when something is
              wrong. A message about the conversation belongs in the
              conversation's column, and must not cover it. */}
          <StreamHealthNotice health={props.connectionHealth} />

          <MessageComposer {...props.composerProps} />
        </ChatPanelDropzone>

        {props.showInlineActions ? <ChatThreadActionRail {...props.actionRailProps} /> : null}
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
