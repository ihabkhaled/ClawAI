/** One HTTP exchange as seen by `followRedirectsSafely`, before any redirect is followed. */
export type RedirectHop<T> = {
  status: number;
  /** The raw `Location` header, or null when there is none. */
  location: string | null;
  response: T;
};

/** The last, non-redirect exchange plus the URL it came from. */
export type SafeRedirectResult<T> = {
  response: T;
  finalUrl: string;
  /** Every URL requested, in order, starting with the original. */
  chain: string[];
};

export type SafeRedirectOptions = {
  maxRedirects: number;
  /** Operator allowlist — private hosts pass only when named here. */
  allowlist: readonly string[];
};
