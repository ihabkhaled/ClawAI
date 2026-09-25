/** On-disk manifest for one in-progress chunked-upload session. */
export interface ChunkedUploadManifest {
  uploadId: string;
  userId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  totalChunks: number;
  receivedChunks: number[];
  createdAt: string;
}

export interface ChunkedUploadStatus {
  uploadId: string;
  totalChunks: number;
  receivedChunks: number[];
  complete: boolean;
}

/**
 * Answer of `DELETE /files/upload/chunked/:uploadId`. `aborted: false` means
 * there was nothing to abort — already completed, already aborted, expired, or
 * not this user's session (indistinguishable on purpose). Never an error, so a
 * client retrying its abort cannot fail.
 */
export interface ChunkedUploadAbortResult {
  uploadId: string;
  aborted: boolean;
}
