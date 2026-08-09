'use client';

import { MessageBubble } from '@/components/chat/message-bubble';
import { ParallelMessageGroup } from '@/components/chat/parallel-message-group';
import type { VirtualizedMessageItemProps } from '@/types';

// Pure-render row for the Virtuoso messages list. Branches on item.kind to
// render either a parallel-compare group or a single message bubble. Lives
// in its own file so virtualized-messages.tsx stays hook-free and the
// controller hook can pass it as the Virtuoso itemContent callback target.
export function VirtualizedMessageItem({
  item,
  onFeedback,
  onRegenerate,
  t,
}: VirtualizedMessageItemProps): React.ReactElement {
  // A separator tops every row rather than being conditional on index: with
  // virtualization the first RENDERED row is not the first message (Virtuoso
  // prepends around VIRTUOSO_START_INDEX), so an index test would draw the rule
  // in the wrong place while scrolling back through history.
  return (
    <div className="px-4">
      <div className="chat-message-separator" aria-hidden />
      <div className="py-5 sm:py-6">
        {item.kind === 'parallel' ? (
          <ParallelMessageGroup messages={item.messages} t={t} />
        ) : (
          <MessageBubble
            message={item.message}
            onFeedback={onFeedback}
            onRegenerate={onRegenerate}
          />
        )}
      </div>
    </div>
  );
}
