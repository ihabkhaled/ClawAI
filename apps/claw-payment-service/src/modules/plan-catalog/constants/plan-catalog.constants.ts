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

// Auth owns the credit catalog beside `PlanPriceVersion`, so payment reaches it
// the same way it reaches a plan price: over the service-authenticated internal
// API, Zod-validated before the answer is allowed to become a charge.
export const CREDIT_PACKAGE_PATHS = {
  PACKAGES: '/api/v1/internal/credit/packages',
} as const;

// Cached only as long as the plan catalog. A package's ACTIVE version changes
// the moment an operator publishes a new price, and a stale hit here would sell
// yesterday's ratio.
export const CREDIT_PACKAGE_CACHE_TTL_MS = PLAN_CATALOG_CACHE_TTL_MS;
