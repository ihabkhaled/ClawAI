export interface PinnedGetOptions {
  timeoutMs: number;
  maxBytes: number;
}

export interface PinnedGetResult {
  status: number;
  /** Lower-case media type without parameters ('' when absent). */
  contentType: string;
  body: Buffer;
}
