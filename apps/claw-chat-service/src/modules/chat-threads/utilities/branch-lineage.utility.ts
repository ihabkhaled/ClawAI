import type { ChatThread } from '../../../generated/prisma';
import type {
  CreateThreadData,
  ThreadLineage,
  ThreadLineageEntry,
} from '../types/chat-threads.types';

/**
 * The lineage fields a new branch of `source`, cut at `fromMessageId`, carries.
 *
 * The root is inherited, never recomputed: a branch of a branch belongs to the
 * same family as its grandparent, and that is what lets one indexed read find
 * every alternate future of one conversation.
 */
export function branchLineageFor(
  source: ChatThread,
  fromMessageId: string,
): Pick<CreateThreadData, 'branchedFromThreadId' | 'branchedFromMessageId' | 'branchRootThreadId'> {
  return {
    branchedFromThreadId: source.id,
    branchedFromMessageId: fromMessageId,
    branchRootThreadId: source.branchRootThreadId ?? source.id,
  };
}

/**
 * The lineage view of `thread`. A branch whose source lookup came back empty is
 * reported as `parentDeleted`, so the UI says "the original is gone" instead of
 * pretending the thread was never a branch.
 */
export function buildThreadLineage(
  thread: ChatThread,
  parent: ThreadLineageEntry | null,
  branches: ThreadLineageEntry[],
): ThreadLineage {
  return {
    threadId: thread.id,
    parent,
    parentDeleted: thread.branchedFromThreadId !== null && parent === null,
    forkMessageId: thread.branchedFromMessageId,
    branches,
  };
}
