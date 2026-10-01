import { type ChatThread, type RoutingMode, type ThreadOrigin } from '../../../generated/prisma';
import { type RepositoryRefDto } from '../dto/repository-ref.dto';

export interface CreateThreadData {
  userId: string;
  title?: string;
  routingMode?: RoutingMode;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  preferredProvider?: string;
  preferredModel?: string;
  contextPackIds?: string[];
  origin?: ThreadOrigin;
  /** ADR-087 — "use relevant previous chats". Omitted means false. */
  useCrossThreadContext?: boolean;
  useMemory?: boolean;
  useContext?: boolean;
  /** F095 — the repository this thread was started in; normalised before it gets here. */
  repositoryRef?: RepositoryRefDto;
  /** Branch lineage — set only by `branchThread`, never from a request body. */
  branchedFromThreadId?: string;
  branchedFromMessageId?: string;
  branchRootThreadId?: string;
}

export interface UpdateThreadData {
  title?: string;
  isPinned?: boolean;
  isArchived?: boolean;
  routingMode?: RoutingMode;
  lastProvider?: string;
  lastModel?: string;
  systemPrompt?: string | null;
  temperature?: number | null;
  maxTokens?: number | null;
  preferredProvider?: string | null;
  preferredModel?: string | null;
  contextPackIds?: string[];
  judgeEnabled?: boolean;
  judgeModel?: string | null;
  criticEnabled?: boolean;
  criticModel?: string | null;
  qualityThreshold?: number | null;
  maxReRouteAttempts?: number | null;
  useMemory?: boolean;
  useContext?: boolean;
  useCrossThreadContext?: boolean;
}

export interface ThreadFilters {
  userId: string;
  origin?: ThreadOrigin;
  search?: string;
  isPinned?: boolean;
  isArchived?: boolean;
}

export interface ThreadWithMessageCount extends ChatThread {
  _count: { messages: number };
}

export type SeedThreadInput = {
  userId: string;
  systemPrompt?: string;
  initialUserMessage: string;
  title?: string;
};

/** What a rewind answers: the thread, the kept pivot and how much was dropped. */
export interface RewindThreadResult {
  threadId: string;
  afterMessageId: string;
  removedCount: number;
}

/** One thread as it appears in a lineage view: enough to label and link it. */
export type ThreadLineageEntry = {
  id: string;
  title: string | null;
  createdAt: Date;
  branchedFromMessageId: string | null;
};

/**
 * Where a thread sits in its branch family.
 *
 * `parent` is null for a root thread AND for a branch whose source was deleted;
 * `parentDeleted` tells those apart, so the UI can say "the original is gone"
 * instead of pretending the thread was never a branch.
 */
export type ThreadLineage = {
  threadId: string;
  parent: ThreadLineageEntry | null;
  parentDeleted: boolean;
  forkMessageId: string | null;
  branches: ThreadLineageEntry[];
};
