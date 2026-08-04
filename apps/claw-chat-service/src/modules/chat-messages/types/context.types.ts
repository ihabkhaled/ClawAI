import { type ChatMessage } from '../../../generated/prisma';
import type { ToolTurn } from './tool-turn.types';

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
  tokenBudget: number;
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
