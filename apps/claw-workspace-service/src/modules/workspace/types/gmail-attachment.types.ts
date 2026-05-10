export type GmailAttachmentRef = {
  fileServiceFileId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  partId: string;
  extractedText: string | null;
};

export type GmailRichMetadata = {
  renderedHtml: string | null;
  renderedText: string | null;
  /**
   * Stream 22.3 → 30: concatenated attachment text for inclusion in the
   * indexable content of the parent EMAIL WorkspaceObject.
   */
  indexableAttachmentText: string;
  attachmentRefs: GmailAttachmentRef[];
};
