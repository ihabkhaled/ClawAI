'use client';

import { ThreadContextInspectorBody } from '@/components/chat/thread-context-inspector-body';
import { THREAD_CONTEXT_INSPECTOR_ENABLED } from '@/constants';
import type { ThreadContextInspectorProps } from '@/types';

export function ThreadContextInspector({
  messageId,
}: ThreadContextInspectorProps): React.ReactElement | null {
  // Hard early-return BEFORE any hook is called so tests / production code
  // that never sets `NEXT_PUBLIC_ROUTING_DEBUG_CONTEXT_INSPECTOR_ENABLED=true`
  // don't need a QueryClientProvider in scope.
  if (!THREAD_CONTEXT_INSPECTOR_ENABLED) {
    return null;
  }
  return <ThreadContextInspectorBody messageId={messageId} />;
}
