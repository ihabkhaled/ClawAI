/** The two fields of an attachment the attachment-only instruction needs. */
export type AttachmentDescriptor = {
  mimeType: string;
  filename: string;
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
};

/** The two fields every send schema's content-or-attachments rule reads. */
export type ContentOrAttachmentsInput = {
  content?: string;
  fileIds?: string[];
};
