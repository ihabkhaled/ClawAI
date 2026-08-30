import { type ChatMessage } from '../../../generated/prisma';
import type { ToolTurn } from './tool-turn.types';
import type { ConversationContextManifest, ModelTokenBudget } from './context-composer.types';
import type { CrossThreadRetrievalResult } from './cross-thread-retrieval.types';

export type FileChunkResponse = {
  id: string;
  fileId: string;
  chunkIndex: number;
  content: string;
};

export type FileContentResponse = {
  id: string;
  filename: string;
  mimeType: string;
  content: string | null;
};

export type WorkspaceCitation = {
  id: string;
  title: string;
  type: string;
  provider: string;
  url: string | null;
  snippet: string | null;
};

export type AssembledContext = {
  userId: string;
  systemPrompt: string | null;
  threadMessages: ChatMessage[];
  memories: MemoryRecordResponse[];
  contextPackItems: Array<{ content: string | null; type: string }>;
  fileContents: FileContentResponse[];
  workspaceCitations: WorkspaceCitation[];
  /** Evidence items produced by a research run (web search, fetch, etc). */
  researchEvidence: ResearchEvidenceCitation[];
  /** Id of the ResearchRun whose evidence is in `researchEvidence` (for trace). */
  researchRunId: string | null;
  /** Warnings produced by the research run (e.g. fetch failures). */
  researchWarnings: string[];
  /**
   * Completed Runtime V2 tool rounds, oldest first.
   *
   * Runtime V2 tools execute client-side across an SSE hop, so the provider
   * transcript cannot live on a call stack — it is rebuilt from here on every
   * continuation. Each request builder renders these into its own dialect
   * (Anthropic's tool result is a `user` turn, which no role-preserving
   * transform can produce from an OpenAI `tool` turn).
   *
   * Optional so every existing construction site keeps compiling; absent and
   * empty both mean "no tool rounds yet".
   */
  toolTurns?: readonly ToolTurn[];
  /**
   * DEPRECATED. The old single number that meant both "how long may the answer
   * be" and "how big may the prompt be". Retained so existing call sites keep
   * compiling and the receipt keeps its shape; read `modelBudget` instead.
   */
  tokenBudget: number;
  /** The four separated quantities. The only correct source of an input budget. */
  modelBudget: ModelTokenBudget;
  /**
   * Which of the thread's messages reached the model this turn, and why the
   * rest did not. Written to the context receipt.
   */
  conversationManifest: ConversationContextManifest;
  /**
   * Material from the user's OTHER conversations, and the reason there is none
   * when there is none. Always present; `selections` is empty unless the thread
   * opted in and something scored. ADR-087.
   */
  crossThread: CrossThreadRetrievalResult;
};

export type ResearchEvidenceCitation = {
  id: string;
  title: string | null;
  url: string;
  snippet: string;
  source: string;
  providerKind: string | null;
  publishedAt: string | null;
  confidence: number;
};

export type MemoryRecordResponse = {
  id: string;
  userId: string;
  type: string;
  content: string;
  isEnabled: boolean;
  /**
   * An explicit "always use this" from the author.
   *
   * Optional because memory-service has not always returned it; absent is
   * treated as not pinned rather than as a reason to drop the memory.
   */
  pinned?: boolean;
};

export type ContextPackResponse = {
  id: string;
  name: string;
  items: Array<{
    id: string;
    type: string;
    content: string | null;
    sortOrder: number;
  }>;
};

export type WorkspaceSearchHit = {
  id: string;
  title: string;
  type: string;
  provider: string;
  url: string | null;
  snippet: string | null;
};

export type WorkspaceSearchApiResponse = {
  results: WorkspaceSearchHit[];
  total: number;
  query: string;
};
