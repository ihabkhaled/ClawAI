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
  if (item.kind === 'parallel') {
    return (
      <div className="px-4 py-2">
        <ParallelMessageGroup messages={item.messages} t={t} />
      </div>
    );
  }
  return (
    <div className="px-4 py-2">
      <MessageBubble
        message={item.message}
        onFeedback={onFeedback}
        onRegenerate={onRegenerate}
      />
    </div>
  );
}
