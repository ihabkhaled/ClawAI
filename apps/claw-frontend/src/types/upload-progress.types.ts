/** Point-in-time read of an in-flight upload. Recomputed on a tick, not per byte. */
export type UploadProgressSnapshot = {
  percent: number;
  bytesUploaded: number;
  totalBytes: number;
  bytesPerSecond: number;
  /** Null until at least one byte has moved — there is nothing to estimate from yet. */
  etaSeconds: number | null;
  elapsedSeconds: number;
};

export type UseChunkedUploadParams = {
  onProgress?: (snapshot: UploadProgressSnapshot) => void;
};

export type UploadProgressIndicatorProps = {
  progress: UploadProgressSnapshot;
};

export type UseChunkedUploadReturn = {
  /** Uploads `file`, chunking it when it is above the threshold. Resolves to the stored file's id. */
  upload: (file: File) => Promise<string>;
  progress: UploadProgressSnapshot | null;
  isUploading: boolean;
  /** Set when every retry for a chunk is exhausted; `upload` also rejects with it. */
  error: Error | null;
};
