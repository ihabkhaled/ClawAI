// Cache namespaces. Every segment that comes from outside is allowlist-validated
// BEFORE it is interpolated: an unvalidated currency code in a key is a way to
// mint unlimited Redis keys from a query string.
export const DISPLAY_FX_CACHE_PREFIX = 'display-fx:rate';
export const DISPLAY_FX_NEGATIVE_CACHE_PREFIX = 'display-fx:unsupported';
export const DISPLAY_FX_LOCK_PREFIX = 'display-fx:lock';
export const GEO_COUNTRY_CACHE_PREFIX = 'display-fx:geo';

// Single-flight window. Long enough that a thousand simultaneous cold-cache
// visitors produce one upstream call, short enough that a crashed holder does
// not wedge the currency for anyone.
export const DISPLAY_FX_LOCK_TTL_S = 10;
export const DISPLAY_FX_LOCK_WAIT_MS = 1_200;
export const DISPLAY_FX_LOCK_POLL_MS = 60;

// Header nginx sets from the real socket address. Unlike X-Forwarded-For, which
// nginx APPENDS to whatever the client sent, this one is overwritten on every
// request and therefore cannot be spoofed from the internet.
export const TRUSTED_CLIENT_IP_HEADER = 'x-real-ip';

// Edge country header. Only consulted when the operator has turned it on, which
// is only correct on a deployment whose edge rewrites it.
export const EDGE_COUNTRY_HEADER = 'cf-ipcountry';
