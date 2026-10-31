/** Per-URL outcome of a parallel fetch batch (ADR-211). */
export type FetchBatchStatus = 'OK' | 'FAILED' | 'TIMEOUT' | 'BLOCKED_ROBOTS' | 'BLOCKED_SSRF';

export type FetchBatchOutcome<R> = {
  /** Position in the input list: the order results are reported in. */
  index: number;
  url: string;
  status: FetchBatchStatus;
  value?: R;
  /** Human reason for a non-OK status. */
  error?: string;
  /** Epoch ms the worker started; null when it never started. */
  startedAt: number | null;
  /** Epoch ms the worker ended; null when it never ended inside the cap. */
  endedAt: number | null;
};

export type FetchBatchOptions<T, R> = {
  urlOf: (item: T) => string;
  worker: (item: T, index: number) => Promise<R>;
  /** Hosts in flight at once (a host's own items are serial). */
  concurrency: number;
  /** Wall-clock cap for the whole batch; null = uncapped. */
  deadlineMs: number | null;
  now?: () => number;
};

/** One row of `EvidenceBundle.fetchReport`. */
export type EvidenceFetchReportEntry = {
  url: string;
  origin: 'user' | 'search';
  status: FetchBatchStatus;
  durationMs: number | null;
};

/** `EvidenceBundle.fetchSummary`: proof the pages overlapped. */
export type EvidenceFetchSummary = {
  attempted: number;
  ok: number;
  /** Wall time of the fetch phase(s). */
  wallMs: number;
  /** Sum of the per-page durations; greater than wallMs when pages overlapped. */
  sumMs: number;
};
