/** Scope of the single global router configuration. Per-tenant scopes need a
 * tenant-scoping migration first; this constant is the one place that changes. */
export const ROUTER_CONFIGURATION_GLOBAL_SCOPE = 'GLOBAL';

/** Why the cloud router declined to produce a decision. Safe for a trace event. */
export const CLOUD_ROUTER_UNAVAILABLE_NO_CONFIGURATION = 'NO_PUBLISHED_CONFIGURATION';
export const CLOUD_ROUTER_UNAVAILABLE_DISABLED = 'CONFIGURATION_DISABLED';
export const CLOUD_ROUTER_UNAVAILABLE_NO_RUNNABLE_ENTRY = 'NO_RUNNABLE_CHAIN_ENTRY';
export const CLOUD_ROUTER_UNAVAILABLE_NO_ELIGIBLE_DEPLOYMENT = 'NO_ELIGIBLE_EXECUTION_MODEL';
