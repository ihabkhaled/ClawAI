/** What a caller gets back after asking for a permanent, share-owned copy. */
export interface PublishedCopyResult {
  fileId: string;
  mimeType: string;
  byteSize: number;
}
