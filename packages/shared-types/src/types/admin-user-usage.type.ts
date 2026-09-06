/**
 * Per-user consumption as the ADMIN users page reads it.
 *
 * Distinct from `UserUsageView`, which a user reads about themselves: that one
 * answers "how much of my allowance is left" and therefore carries limits and
 * remainders. This one answers "what has this account actually burned", so it
 * carries the raw input/output split and the request count instead — an
 * operator investigating a bill needs the shape of the traffic, not the
 * headroom.
 */

/**
 * One window (day, week or month) of a user's token consumption.
 *
 * The window is closed at both ends and expressed in the same UTC `YYYY-MM-DD`
 * strings `TokenUsageLedger.date` is keyed by, so the figures can be traced
 * back to exact ledger rows rather than being an opaque total.
 */
export type AdminUsageTokenWindow = {
  /** UTC period key: `YYYY-MM-DD` (day), `YYYY-Www` (ISO week), `YYYY-MM` (month). */
  periodKey: string;
  /** Inclusive UTC `YYYY-MM-DD` lower bound the figures were summed over. */
  fromDate: string;
  /** Inclusive UTC `YYYY-MM-DD` upper bound the figures were summed over. */
  throughDate: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  /** Billable requests in the window, not messages — one request may fan out. */
  requestCount: number;
};

/**
 * Credits a user actually burned in one calendar month.
 *
 * Only `CONSUMPTION` ledger rows are counted. Grants, expiries, top-ups,
 * reservations and admin adjustments all move a wallet without the user having
 * spent anything, and folding them in would report a month of free allowance as
 * if the account had run up a bill.
 */
export type AdminCreditMonthConsumption = {
  /** UTC `YYYY-MM`. */
  monthKey: string;
  /**
   * Integer micro-USD as a decimal string, always >= 0.
   *
   * A string because this is a `bigint` server-side and JSON has no integer
   * type wide enough to promise it survives the trip. Render it with
   * `formatMicroUsd`; never parse it into a float.
   */
  consumedMicroUsd: string;
  /** Ledger rows behind the figure, so an operator can tell 1 big charge from 900 small ones. */
  entryCount: number;
};

/** Everything the admin "usage and consumption" modal renders for one user. */
export type AdminUserUsageStatistics = {
  userId: string;
  /** When the server computed this, ISO-8601. The windows are relative to it. */
  generatedAt: string;
  tokens: {
    day: AdminUsageTokenWindow;
    week: AdminUsageTokenWindow;
    month: AdminUsageTokenWindow;
  };
  /**
   * Newest month first. Months in which the user consumed nothing are omitted
   * rather than reported as zero — an absent month and a zero month mean the
   * same thing here, and inventing rows would imply a retention guarantee the
   * ledger does not make.
   */
  creditsByMonth: AdminCreditMonthConsumption[];
};
