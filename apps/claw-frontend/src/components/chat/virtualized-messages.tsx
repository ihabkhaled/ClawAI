'use client';

import { ChatLimitNoticeCard } from '@/components/chat/chat-limit-notice-card';
import { JumpToLatestButton } from '@/components/chat/jump-to-latest-button';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { STICKY_BOTTOM_THRESHOLD_PX } from '@/constants';
import { Virtuoso } from '@/lib/virtuoso';
import type { VirtualizedMessagesProps } from '@/types';

// Canonical pure-render TSX. ZERO hook calls (built-in or custom). Every
// piece of state, every ref, every callback is produced by
// useVirtualizedMessagesController (composed by useThreadDetailPage) and
// flows in via props. See `apps/claw-frontend/CLAUDE.md` rule 12 and the
// strict-TSX section in root CLAUDE.md.
export function VirtualizedMessages(props: VirtualizedMessagesProps): React.ReactElement {
  if (props.isLoading) {
    return <LoadingSpinner label={props.loadingLabel} />;
  }
  if (props.isEmpty) {
    if (props.persistentError !== null) {
      return (
        <div
          className="text-destructive flex items-center justify-center px-4 py-12 text-sm"
          role="alert"
        >
          {props.persistentError}
        </div>
      );
    }
    // A refusal on the first message is the whole story of this thread so far.
    // "No messages yet" beside a composer that just did nothing is not an
    // explanation, and the toast that carried the reason has already faded.
    if (props.limitNotice !== null) {
      return (
        <div className="flex items-start justify-center px-4 py-12">
          <ChatLimitNoticeCard notice={props.limitNotice} />
        </div>
      );
    }
    return (
      <div className="text-muted-foreground flex items-center justify-center py-12 text-sm">
        {props.emptyLabel}
      </div>
    );
  }
  return (
    <div className="relative h-full">
      <Virtuoso
        ref={props.virtuosoRef}
        style={{ height: '100%' }}
        data={props.renderItems}
        itemContent={props.itemContent}
        initialTopMostItemIndex={props.initialTopMostItemIndex}
        firstItemIndex={props.firstItemIndex}
        alignToBottom
        followOutput={props.handleFollowOutput}
        atBottomStateChange={props.onAtBottomStateChange}
        atBottomThreshold={STICKY_BOTTOM_THRESHOLD_PX}
        startReached={props.handleStartReached}
        increaseViewportBy={props.increaseViewportBy}
        components={{ Header: props.headerContent, Footer: props.footerContent }}
      />
      <JumpToLatestButton
        visible={props.showJumpToLatest}
        onClick={props.onJumpToLatest}
        unreadCount={props.unreadCount}
        t={props.t}
      />
    </div>
  );
}
