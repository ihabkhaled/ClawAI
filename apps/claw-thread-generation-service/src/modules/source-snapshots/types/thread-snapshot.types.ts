/** An attached file's extracted text (document, OCR, transcript), never its bytes. */
export type ThreadSnapshotAttachment = {
  name: string;
  mimeType: string;
  text: string;
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
    /** Absent from a chat-service that predates attachment text, and on turns without any. */
    attachments?: ThreadSnapshotAttachment[];
  }>;
  /** What attached text chat-service left out and why. */
  attachmentNote?: string;
};
