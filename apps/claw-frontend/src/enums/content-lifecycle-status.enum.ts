/**
 * Lifecycle of a `PublicContentDefinition`.
 *
 * `RETIRED` is the un-publish state. Before it existed, taking a page out of
 * the registry meant deleting its entry outright — which deletes the route,
 * the sitemap line, the feed item and the footer link in the same edit, and
 * turns every already-crawled URL across 13 locales into a soft 404 at once.
 * `RETIRED` keeps the entry (and its history) while removing it from every
 * derived surface: every consumer in `content-registry.utility.ts` gates on
 * `status === ContentLifecycleStatus.PUBLISHED`, so a `RETIRED` page is
 * excluded from `getIndexablePages`, `getPublishedPages`, the sitemap, the
 * feeds, the footer and `isKnownPublicPath` the same way `PLANNED` is —
 * without deleting the route file, which can then 410 or redirect instead of
 * 404ing outright.
 *
 * See `docs/05-frontend/seo-content-architecture.md` §8.3 ("Lifecycle").
 */
export enum ContentLifecycleStatus {
  PUBLISHED = 'PUBLISHED',
  PLANNED = 'PLANNED',
  RETIRED = 'RETIRED',
}
