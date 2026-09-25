// Limit applied to the admin overview "Recent audit events" panel. We
// keep it deliberately small — 10 is enough to give a useful glance
// without competing with the dedicated /audits page for vertical space.
export const RECENT_AUDIT_EVENTS_LIMIT = 10;

// Refetch interval (ms) for the recent-audit-events query. Matches the
// 30s/60s rhythm used by other admin queries — busy enough to feel live,
// slow enough to not hammer the audit service.
export const RECENT_AUDIT_EVENTS_REFETCH_INTERVAL_MS = 60_000;

// Refetch interval (ms) for the "Skipped providers" section on /connectors.
// A breaker window is 10 minutes; 30 s shows a trip or a recovery promptly
// without polling chat-service hard. Bounded: the query stops when the page
// unmounts.
export const SKIPPED_PROVIDERS_REFETCH_INTERVAL_MS = 30_000;
