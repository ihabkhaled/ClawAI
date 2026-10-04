export type ThreadSnapshotMessageInput = {
  id: string;
  role: string;
  content: string;
  createdAt: Date;
  metadata: unknown;
};

export type ThreadSnapshotInput = {
  threadId: string;
  title: string | null;
  createdAt: Date;
  messages: ThreadSnapshotMessageInput[];
};

export type ThreadSnapshot = {
  schemaVersion: number;
  sourceThreadId: string;
  title: string | null;
  sourceCreatedAt: string;
  messageCount: number;
  byteCount: number;
  sha256: string;
  messages: Array<{
    id: string;
    role: 'USER' | 'ASSISTANT';
    content: string;
    createdAt: string;
  }>;
};
