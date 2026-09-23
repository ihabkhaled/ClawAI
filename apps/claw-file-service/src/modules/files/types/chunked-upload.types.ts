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
