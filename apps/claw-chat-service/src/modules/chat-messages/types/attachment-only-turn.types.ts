/** The two fields of an attachment the attachment-only instruction needs. */
export type AttachmentDescriptor = {
  mimeType: string;
  filename: string;
};

/** Kinds that each get their own line in the attachment-only instruction. */
export type AttachmentOnlyKind = 'audio' | 'video' | 'image' | 'document';

/** The two fields every send schema's content-or-attachments rule reads. */
export type ContentOrAttachmentsInput = {
  content?: string;
  fileIds?: string[];
};
