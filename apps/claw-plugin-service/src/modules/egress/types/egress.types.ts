export type EgressUrlPolicy = {
  allowedPorts: readonly number[];
};

/** A URL that passed the syntax rules: the parsed form and the host to resolve. */
export type CheckedUrl = {
  url: URL;
  host: string;
  port: number;
};

/** A checked URL whose every DNS answer is public; the connection is pinned to `address`. */
export type ResolvedTarget = CheckedUrl & {
  address: string;
  family: 4 | 6;
};

export type EgressMethod = 'GET' | 'POST' | 'DELETE';

export type EgressRequest = {
  url: string;
  method: EgressMethod;
  headers: Record<string, string>;
  body?: string;
  timeoutMs: number;
  maxResponseBytes: number;
  signal?: AbortSignal;
  /** Ends a streaming body early once the wanted message has arrived (server-sent events). */
  stopWhen?: (textSoFar: string) => boolean;
  /** Hosts this call may reach; absent means any public host. Exact match, lowercase. */
  allowedHosts?: ReadonlySet<string>;
  allowedPorts?: readonly number[];
  /** Redirect hops to follow, each fully re-checked. Absent or 0 refuses every redirect. */
  maxRedirects?: number;
};

export type EgressSendInput = {
  host: string;
  port: number;
  path: string;
  method: EgressMethod;
  headers: Record<string, string>;
  body?: string;
  address: string;
  family: 4 | 6;
  timeoutMs: number;
  maxResponseBytes: number;
  signal?: AbortSignal;
  stopWhen?: (textSoFar: string) => boolean;
};

export type EgressSendResult = {
  status: number;
  /** Header names lowercased; repeated headers joined with ", ". */
  headers: Record<string, string>;
  body: string;
  /** True when the body was cut at maxResponseBytes. */
  truncated: boolean;
};

export type EgressResponse = EgressSendResult;

export type PinnedAddress = { address: string; family: 4 | 6 };

export type PinnedLookupCallback = (
  error: NodeJS.ErrnoException | null,
  addressOrList: string | Array<{ address: string; family: number }>,
  family?: number,
) => void;
