/** One resolved address the fetcher has validated and will connect to. */
export type PinnedAddress = {
  address: string;
  family: 4 | 6;
};

/** Resolves a hostname to EVERY address it currently answers with. */
export type HostResolver = (host: string) => Promise<PinnedAddress[]>;

/** The seam tests (and only tests) replace; production uses the OS resolver. */
export type HostResolution = {
  resolve: HostResolver;
};

export type PinnedFetchInit = {
  signal?: AbortSignal;
  headers?: Record<string, string>;
};
