import type { FileDeliveryMode } from '../../../common/enums/file-delivery-mode.enum';

/** The two fields of an attachment the attachment-only instruction needs. */
export type AttachmentDescriptor = {
  mimeType: string;
  filename: string;
  /** Present on a real file row; lets earlier-turn files be told apart (ADR-152). */
  id?: string;
};

/** Kinds that each get their own line in the attachment-only instruction. */
export type AttachmentOnlyKind = 'audio' | 'video' | 'image' | 'document';

/**
 * What resolving a user turn needs from an assembled context: the files that
 * reached it, and how many were attached. The two differ when a file had
 * nothing readable yet (a video still processing, a failed extraction).
 */
export type AttachmentTurnContext = {
  fileContents: readonly AttachmentDescriptor[];
  requestedAttachmentCount?: number;
  /**
   * Ids among `fileContents` that were attached in EARLIER turns (ADR-152).
   * They are context for a follow-up, not this message's attachments, so the
   * attachment-only instruction never describes them as just sent.
   */
  earlierFileIds?: readonly string[];
};

/** What the attachment pointer needs: the turn's files plus, when stamped, how each reached this lane. */
export type AttachmentPointerContext = AttachmentTurnContext & {
  attachmentDelivery?: { decisions: readonly { fileId: string; mode: FileDeliveryMode }[] };
};

/** An assembled context as the user-turn builders read it: files, delivery plan and the save note. */
export type AttachmentUserTurnContext = AttachmentPointerContext & {
  saveTurnNote?: string;
};

/** The two fields every send schema's content-or-attachments rule reads. */
export type ContentOrAttachmentsInput = {
  content?: string;
  fileIds?: string[];
  /** A quoted selection is something to talk about, like a file. */
  quotes?: readonly unknown[];
};
