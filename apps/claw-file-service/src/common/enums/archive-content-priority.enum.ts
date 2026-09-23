/**
 * Order in which an archive's extracted entries claim the manifest's character
 * budget. Lower goes first: plain text and code are what a user zipping a
 * project usually asks about, and they are the cheapest to read.
 */
export enum ArchiveContentPriority {
  /** Text, code, data and any other entry whose bytes decoded to real text. */
  TEXT = 0,
  /** Documents the service extracts text from (PDF, Office, RTF) and nested archives. */
  DOCUMENT = 1,
  /** Everything else that still produced text, e.g. an image with OCR text. */
  OTHER = 2,
}
