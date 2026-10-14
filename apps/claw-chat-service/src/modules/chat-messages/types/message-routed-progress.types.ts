import type { ChatMessage, ChatThread } from '../../../generated/prisma';

/**
 * What a routed turn has resolved so far. Kept outside the guarded region so
 * the failure handler still sees whatever was loaded before a throw.
 */
export type MessageRoutedProgress = {
  thread: ChatThread | null;
  routedMessages: ChatMessage[];
};
