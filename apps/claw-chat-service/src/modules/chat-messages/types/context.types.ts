import { type ChatMessage } from '../../../generated/prisma';

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
  tokenBudget: number;
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
