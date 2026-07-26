// The catalog changes only when an administrator publishes a new price
// version, so it is cached briefly to keep a checkout burst from stampeding
// auth-service. Short enough that a newly published price is live in a minute.
export const PLAN_CATALOG_CACHE_TTL_MS = 60_000;

// A price version is IMMUTABLE once created, so it can be cached far longer —
// the row it describes can never change, only be retired.
export const PLAN_PRICE_VERSION_CACHE_TTL_MS = 3_600_000;

// Bounded so a stalled auth-service degrades a checkout into a clean failure
// rather than holding request handlers open.
export const PLAN_CATALOG_TIMEOUT_MS = 5_000;

export const PLAN_CATALOG_PATHS = {
  CATALOG: '/api/v1/internal/plans/catalog',
  PRICE: '/api/v1/internal/plans/price',
  PRICE_VERSION: '/api/v1/internal/plans/price-versions',
} as const;
