/**
 * Maximum number of recent load events surfaced through the runtime-progress
 * probe endpoint. The frontend dashboard only renders the most recent slice;
 * deeper history is available through dedicated audit endpoints.
 */
export const RUNTIME_PROBE_RECENT_EVENTS_LIMIT = 10;
