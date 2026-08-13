# Admin Identity, Entitlement Enforcement, and Public Discovery Design

## Scope

This delivery contains three independently gated slices:

1. Secure administrator and user lifecycle management.
2. Authoritative enforcement of every configured plan limit and feature gate.
3. Exhaustive localized sitemap coverage and publication feeds.

The implementation extends existing modules and contracts. It does not create a central cross-service database or rely on frontend-only enforcement.

## Identity and administration

The seeded account identified by `ADMIN_EMAIL` becomes the unique immutable `SUPER_ADMIN`. An idempotent Prisma migration/backfill promotes the already deployed account without changing credentials or profile data. Startup/seed validation fails safely when the configured account is absent or when supremacy is ambiguous. Service-layer invariants prevent deletion, suspension, demotion, role reassignment, email changes, or administrator-initiated password resets for this account.

Only `SUPER_ADMIN` can create, promote, demote, suspend, or reactivate administrators. Regular administrators can manage non-administrator accounts. The admin page lists users with server-side pagination and filters for email/username, role, plan, verification status, and account status. Sort and filter values are validated by Zod and translated into repository predicates.

An administrator password reset generates a cryptographically secure temporary password, stores only its hash, revokes sessions, marks `mustChangePassword`, and sends the temporary credential by email. The credential is never returned by list APIs, persisted in plaintext, or logged. Delivery failure is surfaced to the administrator. Login permits the temporary credential only into the forced password-change flow; normal portal use remains blocked until the password changes.

Registration creates an unverified pending user and sends a single-use verification token. Tokens are random, hashed at rest, expiring, rate-limited, and invalidated after use. Login is blocked until verification. Resend endpoints return neutral responses to prevent account enumeration. Links are built exclusively from the validated configured public application origin (`claw.local`, `claw-ai.co`, or another deployment), never an untrusted Host header. Verification activates the user and invalidates outstanding tokens.

Sensitive mutations publish audit events with actor and subject identifiers but no credentials or tokens.

## Entitlement enforcement

Auth owns plans and resolved entitlements; each resource-owning service enforces its own boundary:

- Chat service: daily thread creations and daily user-message creations.
- Workspace service: active workspace connections.
- Auth/context owner: owned context packs.
- Memory service: stored memory items.
- Every owning service: relevant boolean feature gates before work or mutation begins.

`null` means unlimited, `0` means prohibited, and positive integers are strict maxima. Daily windows use the existing canonical UTC accounting boundary. Enforcement is atomic under concurrency using durable reservations/counters or database transactions in the owning service. Alternate routes, imports, retries, orchestration modes, and background entry points cannot bypass checks.

Entitlement resolution failures fail closed for resource creation and gated paid work. Explicit admin and super-admin bypasses remain documented and tested. UI affordances display limits and localized errors, but API enforcement is authoritative.

Tests cover zero, one, exact limit, limit plus one, unlimited, plan changes, UTC rollover, concurrent final-slot attempts, direct API access, and entitlement outages.

## Sitemap and publication feeds

One canonical public-content registry classifies frontend routes. `sitemap.xml` is a sitemap index with locale/content child maps. Every indexable public route is emitted for all 13 locales with canonical URLs and complete alternates. Tests compare the registry with the generated frontend route manifest so an unclassified public route fails validation.

Only `PUBLIC_INDEXED` chat shares enter discovery. Private, unlisted, deleted, expired, authenticated, admin, callback, checkout, and `noindex` pages are excluded. Dynamic chat maps are chunked, deterministic, XML-escaped, cacheable, and derived from the configured canonical public origin.

`feed.xml` combines indexed public chats and other genuinely publishable public content that has real publication/update dates. Locale feeds use localized canonical URLs and metadata. Static marketing pages remain in sitemaps but do not receive invented feed dates. Feeds are deterministic, deduplicated, bounded, escaped, and exclude unlisted/noindex records.

## Delivery and validation

Each slice uses test-first changes and a coherent gated commit. API tests include authorization, IDOR, validation, concurrency, and email-enumeration cases. Browser validation covers admin search/filter/pagination, forced password change, verification/resend, localized sitemap endpoints, and public chat discovery. Every touched workspace runs typecheck, lint, tests, and build; generated knowledge and inventory artifacts are regenerated after formatting.

## Decisions

- Seeded production admin is migrated to immutable `SUPER_ADMIN`.
- Signup requires email verification before login.
- Admin reset uses a one-time temporary password and forced change.
- Plan enforcement is server-side, atomic, and fail-closed.
- Sitemap includes all localized indexable public pages and indexed public chats.
- Feed includes only indexed publishable content with real dates.
