/**
 * Freshness tiers for TanStack queries.
 *
 * The QueryClient used to carry a global `refetchInterval: 10_000`, so every
 * query in the application polled every ten seconds whether or not its data
 * could change. In v5 `refetchInterval` ignores `staleTime`, so a five-minute
 * `staleTime` on `/auth/me` bought nothing — measured idle traffic on the chat
 * page was ~83 requests per minute, of which one endpoint re-serialised 4.3 MB
 * server-side every ten seconds to answer 304.
 *
 * Polling is now opt-in and the tier is named at the call site, because "why
 * does this refetch?" should be answerable by reading one line. The four tiers
 * come from asking a single question about each query:
 *
 *   **Can this data change without the person looking at it doing anything,
 *   and are they expected to watch it change?**
 *
 * - **LIVE** — yes to both. A run in flight, an approval queue, a device going
 *   offline, an ingestion finishing. These poll.
 * - **BACKGROUND** — yes to the first, no to the second. Dashboards, metrics,
 *   log tails. They drift, but nobody is waiting on a particular row, so a
 *   slower beat is right.
 * - **EVENT** — no. The data changes because of a mutation this user made, or
 *   an event the app already receives over SSE. Invalidation is the mechanism;
 *   a timer is a bug that hides a missing invalidation.
 * - **CONFIG** — reference data. Model catalogs, plans, permissions, provider
 *   lists. Cache it hard and invalidate when an admin changes it.
 *
 * SESSION is EVENT with a shorter leash: the signed-in user's own profile,
 * entitlements and wallet, which a purchase or an admin action can change
 * elsewhere, so a window focus is a good moment to re-check.
 *
 * See rules/06-frontend-queries-and-cache.md.
 */

/** A run, queue or job the user is actively waiting on. */
export const QUERY_POLL_LIVE_MS = 5_000;

/**
 * Something the user is waiting on that is expensive to ask about, or that
 * moves in steps rather than continuously — sync runs, deliveries, handoffs.
 */
export const QUERY_POLL_LIVE_SLOW_MS = 10_000;

/** Dashboards, metrics and log tails: drifts, but nobody is watching a row. */
export const QUERY_POLL_BACKGROUND_MS = 60_000;

/**
 * The default staleTime.
 *
 * Was 5 seconds, which combined with `refetchOnWindowFocus` meant essentially
 * every tab focus refetched everything. A minute is long enough that returning
 * to a tab is cheap and short enough that returning to it after lunch is fresh.
 */
export const QUERY_STALE_DEFAULT_MS = 60_000;

/** Reference data an admin changes and everyone else reads. */
export const QUERY_STALE_CONFIG_MS = 30 * 60_000;

/** The signed-in user's own profile, entitlements and wallet. */
export const QUERY_STALE_SESSION_MS = 5 * 60_000;
