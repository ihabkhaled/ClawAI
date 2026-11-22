/**
 * A file attached to a user turn, as read from file-service without its bytes. `text` is the
 * extracted text (document, OCR, transcript), or null when there is none yet or none at all.
 */
export type ThreadSnapshotAttachmentInput = {
  name: string;
  mimeType: string;
  text: string | null;
};

export type ThreadSnapshotMessageInput = {
  id: string;
  role: string;
  content: string;
  createdAt: Date;
  metadata: unknown;
  attachments?: ThreadSnapshotAttachmentInput[];
};

export type ThreadSnapshotInput = {
  threadId: string;
  title: string | null;
  createdAt: Date;
  messages: ThreadSnapshotMessageInput[];
  /** Attached files never read because the thread had more than the per-snapshot file cap. */
  unreadAttachmentCount?: number;
};

/** An attached file's text in the snapshot. Present only when it has text. */
export type ThreadSnapshotAttachment = {
  name: string;
  mimeType: string;
  text: string;
};

export type ThreadSnapshotMessage = {
  id: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  createdAt: string;
  /** Optional on the wire: absent when the turn had no attached text, so old readers still parse. */
  attachments?: ThreadSnapshotAttachment[];
};

export type ThreadSnapshot = {
  schemaVersion: number;
  sourceThreadId: string;
  title: string | null;
  sourceCreatedAt: string;
  messageCount: number;
  byteCount: number;
  sha256: string;
  messages: ThreadSnapshotMessage[];
  /** What attached text was left out and why. Absent when nothing was. */
  attachmentNote?: string;
};

/** What happened to the attached files that did not travel whole, for the snapshot's note. */
export type ThreadSnapshotAttachmentCounts = {
  noText: number;
  withheld: number;
  shortened: number;
  overBudget: number;
};

/** An attached file ready for the byte budget, marked when its text was shortened. */
export type ThreadSnapshotAttachmentCandidate = ThreadSnapshotAttachment & { shortened: boolean };
