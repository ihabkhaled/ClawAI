export interface PinnedGetOptions {
  timeoutMs: number;
  maxBytes: number;
  /** Extra request headers (a platform API's client id, a JSON content type). */
  headers?: Readonly<Record<string, string>>;
  /** 'GET' by default; a POST sends `body`. */
  method?: 'GET' | 'POST';
  body?: string;
}

export interface PinnedGetResult {
  status: number;
  /** Lower-case media type without parameters ('' when absent). */
  contentType: string;
  body: Buffer;
}
