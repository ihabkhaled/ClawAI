# Phase A: Public/Private Architecture Foundation — Design Spec

**Date:** 2026-07-24
**Status:** Approved for implementation planning
**Author:** Claude (design session with Ihab Khaled)
**Phase:** A of 6 (A–F) in the AdSense/SEO/i18n/auth enhancement program

## 1. Context and problem statement

ClawAI's frontend (`apps/claw-frontend`, Next.js 16 App Router) currently has **no public surface**. There are exactly two route groups — `(auth)` for login/register and `(portal)` for the entire authenticated application (chat, dashboard, connectors, models, routing, memory, context, files, audits, logs, observability, settings, admin, research, workspace, usage, plan, agent — ~90 routes total). The root route `/` is an unconditional server-side `redirect(ROUTES.CHAT)` — every visitor, authenticated or not, is thrown straight into the auth-gated portal shell.

There is no metadata infrastructure at all: no `sitemap.ts`, no `robots.ts`, no `manifest`, no `favicon.ico`, no Open Graph image, no `metadataBase`. Root metadata is a bare `{ title, description }`. `<html lang="en">` is hard-coded with no `dir` attribute. `public/` contains exactly one file (`claw-logo.svg`), unwired.

This design (Phase A of a larger 6-phase program — see §8) builds the **architectural foundation** that all later phases (content pages, i18n expansion, AdSense/contact, hardening) depend on: a real public homepage, a clean public/private route split, crawler-correct metadata plumbing, and a typed content registry as the single source of truth for navigation, metadata, sitemap generation, and ad eligibility.

**Explicitly out of scope for Phase A** (deferred to later phases per the approved decomposition):

- The ~29 additional editorial/guide/legal content pages (Phase B)
- Locale expansion beyond the existing 9 (fa/th/zh-CN/ja), localized URLs, script-aware fonts (Phase C)
- `rememberMe` / token-storage rewrite / password-manager work (Phase D — independent, may run in parallel)
- AdSense eligibility engine, `ads.txt`, contact form + email pipeline, consent/CMP (Phase E)
- Nonce-based CSP, WCAG 2.2 AA full pass, Lighthouse CI, `release:preflight` (Phase F)

## 2. Goals

1. Replace the `/` → `/chat` redirect with a real, substantial, server-rendered public homepage.
2. Establish `(marketing)` / `(auth)` / `(portal)` as three explicit, cleanly separated route groups.
3. Make every portal and auth route non-indexable via both `metadata.robots` **and** an `X-Robots-Tag` header — never rely on robots.txt alone.
4. Introduce a typed content registry as canonical source for nav, metadata, sitemap, and ad-eligibility, so unknown/unregistered routes default safely (non-indexable, ad-ineligible).
5. Ship baseline crawler infrastructure: `robots.ts`, `sitemap.ts`, `manifest.ts`, favicon/OG image, `metadataBase`, canonical URLs.
6. Ship a public header and footer, structurally independent of the portal's `Topbar`/`Sidebar`.
7. Preserve every existing portal URL, every existing portal behavior, and all existing governance (ESLint rules, tsgo, i18n system, RBAC, docker/nginx/vercel paths) without weakening any of them.

## 3. Non-goals

- No new editorial content pages beyond the homepage (registry entries for them exist as `planned`, not `published`).
- No locale count change (still the existing 9 locales; the public/private split must not break any of them).
- No changes to authentication, token storage, or session behavior.
- No AdSense script, ad units, or contact form — only the _registry fields_ (`adEligibility`, `reviewStatus`) that later phases will consume.
- No CSP changes beyond what's needed to keep the existing theme-init inline script working under the current (unchanged) header set.

## 4. Architecture

### 4.1 Route groups

```
src/app/
├── layout.tsx                      # root: metadataBase, icons, manifest, fonts (unchanged font strategy), <html> locale/dir-aware
├── not-found.tsx                   # NEW — localized custom 404, noindex
├── robots.ts                       # NEW
├── sitemap.ts                      # NEW
├── manifest.ts                     # NEW
├── icon.svg                        # NEW (derived from claw-logo.svg)
├── apple-icon.png                  # NEW
├── opengraph-image.tsx             # NEW (next/og ImageResponse, 1200x630)
│
├── (marketing)/                    # NEW — public, indexable
│   ├── layout.tsx                  # server: MarketingHeader + MarketingFooter, base OG/robots
│   └── page.tsx                    # homepage, generateMetadata()
│
├── (auth)/                         # EXISTING routes, NEW server layout
│   ├── layout.tsx                  # NEW — server, noindex metadata
│   ├── login/page.tsx              # unchanged
│   └── register/page.tsx           # unchanged
│
└── (portal)/
    ├── layout.tsx                  # CHANGED — becomes a server component, noindex metadata, renders PortalShell
    └── ...all ~90 existing routes  # UNCHANGED — no file moves, no URL changes
```

`src/app/page.tsx` (the redirect file) is **deleted**; `(marketing)/page.tsx` becomes the new `/`.

### 4.2 Portal layout split

Current `(portal)/layout.tsx` is a client component (`'use client'`) that calls `useAuthGuard()`, `usePreferenceBootstrap()`, `useLayoutShortcuts()`, and renders `SkipToContent` + `Sidebar` + `Topbar` + `PortalContent` (in an `ErrorBoundary`) + `MobileBottomNav`.

Split:

- **`(portal)/layout.tsx`** (new, server component): exports `export const metadata: Metadata = { robots: { index: false, follow: false, nocache: true } }`. Renders `<PortalShell>{children}</PortalShell>`.
- **`src/components/layout/portal-shell.tsx`** (new, client component, `'use client'`): contains the _entire_ body of the current layout, verbatim — same hooks, same JSX, same loading state. This is a pure extraction; no behavioral change.

This is the standard Next.js pattern for "server layout owns metadata, client component owns interactivity" and matches how `(marketing)` will also work (server layout, client-only pieces — theme toggle, mobile menu — pushed into leaf client components).

### 4.3 `X-Robots-Tag` middleware enforcement

`metadata.robots` on the portal/auth layouts covers the common case, but per the requirements we must not rely on metadata exports alone (e.g., they don't apply to non-HTML responses or guarantee header-level enforcement). `src/middleware.ts` (already exists, currently a near-no-op reading the `claw-auth-token` marker cookie) gains:

- A new utility `src/utilities/route-visibility.utility.ts` exporting `isPublicPath(pathname: string): boolean`, which checks the pathname against the **content registry's** published+indexable public paths (see §4.4) plus a small static allowlist for framework files (`/robots.txt`, `/sitemap.xml`, `/manifest.webmanifest`, `/icon.svg`, `/apple-icon.png`, `/opengraph-image`, `/favicon.ico`).
- Middleware logic: for any response where `isPublicPath(pathname)` is `false`, set `response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive')`. Public paths get no such header (they rely on the page's own `metadata.robots` staying permissive, which is the default).
- This is also the single implementation of the "unknown route defaults to non-indexable" rule: any path not explicitly in the registry as `published + indexable` falls through to the noindex header.

### 4.4 Typed content registry

New files:

- `src/enums/content-category.enum.ts` — `ContentCategory` (e.g. `HOME`, `ABOUT`, `ARCHITECTURE`, `GUIDE`, `LEGAL`, `COMPARISON`, `FAQ`, `CONTACT` — full set defined now even though Phase A only populates `HOME`, so Phase B doesn't need an enum migration).
- `src/enums/indexability.enum.ts` — `Indexability = INDEXABLE | NOINDEX`.
- `src/enums/ad-eligibility.enum.ts` — `AdEligibility = ELIGIBLE | INELIGIBLE`.
- `src/enums/content-review-status.enum.ts` — `ContentReviewStatus = REVIEWED | PENDING_REVIEW`.
- `src/enums/structured-data-type.enum.ts` — `StructuredDataType = WEBSITE | ORGANIZATION | SOFTWARE_APPLICATION | FAQ_PAGE | BREADCRUMB_LIST | TECH_ARTICLE | WEB_PAGE | NONE`.
- `src/types/content-registry.types.ts` — `ContentPageStatus = 'published' | 'planned'` (kept as a narrow literal union deliberately — see note below) and:

```ts
export type ContentRegistryEntry = {
  slug: string; // e.g. 'home', 'about'
  locale: Locale;
  status: ContentPageStatus; // 'published' | 'planned'
  title: string;
  description: string;
  category: ContentCategory;
  canonicalPath: string; // e.g. '/' or '/about'
  lastReviewed: string; // ISO date, real content date
  indexability: Indexability;
  adEligibility: AdEligibility;
  reviewStatus: ContentReviewStatus;
  relatedSlugs: string[];
  structuredDataType: StructuredDataType;
};
```

Note on `ContentPageStatus`: the codebase's "no string literal unions" rule targets _domain_ values compared with `===` in business logic. `'published' | 'planned'` is a two-value internal build-time filter, analogous to how the codebase already tolerates literal unions for narrow structural discriminants — but to stay strictly compliant we define it as a proper enum (`ContentLifecycleStatus.PUBLISHED | .PLANNED`) in `src/enums/content-lifecycle-status.enum.ts` rather than a literal union. (Correction applied during self-review — see §9.)

- `src/constants/content-registry.constants.ts` — `CONTENT_REGISTRY: ReadonlyArray<ContentRegistryEntry>`. Phase A populates exactly **one published entry** (home, `en` locale — the only locale with public copy until Phase C) plus ~29 `planned` entries (one per page listed in the parent spec's page inventory, `en` locale, status `planned`, `reviewStatus: PENDING_REVIEW`, `adEligibility: INELIGIBLE`) so the registry's shape and Phase B's job (flip status + fill copy) are already correct.
- `src/utilities/content-registry.utility.ts` — pure query helpers: `getPublishedPages()`, `getPageBySlug()`, `isKnownPublicPath(path)`, `getIndexablePages()` — used by nav, sitemap, robots-middleware, and (later) the ad-eligibility resolver.

Business rule enforced by a helper, not scattered: a `planned` entry is **always** `indexability: NOINDEX`, `adEligibility: INELIGIBLE` regardless of what's set on it (defense in depth) — enforced in `getIndexablePages()`/`isKnownPublicPath()`, not by trusting the data.

### 4.5 Homepage content

`src/app/(marketing)/page.tsx` — a server component. Content lives in a dedicated component tree under `src/components/marketing/home/` (one component per section, per the "components do one thing" rule): `HeroSection`, `ProblemSection`, `LocalFirstSection`, `RoutingSection`, `OrchestrationSection` (compare/consensus/escalation/best-of-N/repair/verify/pipelines/role-packs), `MemoryContextSection`, `FilesRagSection`, `WorkspaceSection`, `DesktopAgentSection`, `GenerationSection` (image + file-gen), `ObservabilitySection`, `SecuritySection`, `SelfHostingSection`, `LimitationsSection`, `CtaSection`. Each renders static, original, server-rendered copy (no client hooks) — the "works with JS disabled" requirement.

One `<h1>` (in `HeroSection`). `generateMetadata()` in `page.tsx` reads the registry's `home` entry for title/description/canonical and builds `openGraph`/`twitter` fields from it plus `site-config`.

A visible last-reviewed date renders from the registry entry's `lastReviewed` field (not hardcoded in the component).

### 4.6 Public header and footer

- `src/components/marketing/marketing-header.tsx` (server-shell) + `src/components/marketing/marketing-mobile-menu.tsx` (client, focus-trap/Escape/close-on-nav) + a shared `src/hooks/marketing/use-marketing-mobile-menu.ts`.
- `src/components/marketing/marketing-footer.tsx` (server) — product/feature/guide/architecture/security link groups sourced from `getPublishedPages()` (so it never links to a `planned` page), GitHub link, current year (computed, not hardcoded — via a tiny server-safe utility, not `Date.now()` misuse), app version (from `package.json` via a build-time constant, not a runtime fetch), language dropdown, social links from validated env config (hidden if unset).
- **Public locale switcher**: the existing `LocaleSwitcher` (`src/components/layout/locale-switcher.tsx`) calls `useUpdatePreferences()` (an authenticated mutation) on change — this would throw/fail for anonymous visitors. Phase A extracts the _presentational_ dropdown into `src/components/shared/locale-dropdown.tsx` (native names, accessible, keyboard-navigable, RTL-safe — no behavior), then:
  - `LocaleSwitcher` (portal, unchanged behavior) wraps it and still calls `updatePreferences`.
  - New `MarketingLocaleSwitcher` wraps it and only calls `setLocale()` (context + localStorage), no API call.
  - This is a refactor-extraction, not new UI design — same accessible dropdown, two thin behavior wrappers.
- **Public theme toggle**: the existing theme toggle already reads/writes `localStorage('claw-theme')` directly with no auth dependency (per the root layout's `THEME_INIT_SCRIPT`), so it is reused as-is in the marketing header with no extraction needed — confirmed during implementation, not assumed.
- CTAs: **Log in** (`/login`) and **Open Claw** (`/chat` — relies on the existing portal auth guard to redirect unauthenticated users to login; no client-side auth detection on public pages, avoiding hydration mismatch/CLS).
- Skip link (`SkipToContent`, already exists in `src/components/layout/` — reused, not duplicated).

### 4.7 Metadata, robots, sitemap, manifest, icons

- `src/lib/site/site-config.ts` — server-only module. Zod schema validates `SITE_URL`: must be `https://`, must not be `localhost`/`127.0.0.1`/a Vercel preview pattern (`*.vercel.app` with a hash-like subdomain) **when `NODE_ENV === 'production'` and not explicitly a preview deploy**; must have no trailing path/fragment. Exposes `getSiteUrl()`, `isProductionCanonical()`. In non-production or when `SITE_URL` is unset/invalid, the module returns a safe fallback (`http://localhost:3000` for local dev) **and** flags `shouldNoIndexEverything()` for use by `robots.ts` — this is how "preview/dev deployments return site-wide noindex" is satisfied without ever calling `redirect`/`throw` in a way that breaks local dev.
- Root `layout.tsx`: adds `metadataBase: new URL(getSiteUrl())`, `title: { default: '...', template: '%s | ClawAI' }`, default `openGraph`/`twitter`, `icons: { icon: '/icon.svg', apple: '/apple-icon.png' }`, `manifest: '/manifest.webmanifest'`. `<html lang={...} dir={...}>` becomes locale-aware — reads the same server-resolvable default (`Locale.EN`/`Direction.LTR`) Phase A ships with; full server-side locale resolution is Phase C's job, Phase A just removes the hardcoding so the attribute is correct for the default locale and structurally ready.
- `src/app/robots.ts`: `Allow: /` for public paths (derived from the registry, not hand-listed), explicit `Disallow` for `/api`, `/chat`, `/dashboard`, `/connectors`, ... (the full private-prefix list, generated from the _portal route directory itself_ via a small build-time list in `src/constants/private-route-prefixes.constants.ts` — kept in sync automatically rather than hand-maintained twice), references `sitemap.xml`. When `shouldNoIndexEverything()` is true: single `{ userAgent: '*', disallow: '/' }`.
- `src/app/sitemap.ts`: maps `getIndexablePages()` (registry-driven, so only `published + INDEXABLE` entries) to `MetadataRoute.Sitemap` entries with absolute `getSiteUrl()`-prefixed URLs and real `lastModified` (from `lastReviewed`). Phase A yields exactly one `<url>` (the homepage). No `priority`/`changeFrequency` (per spec: don't set meaningless values).
- `src/app/manifest.ts`: name, short_name, icons (192/512 + maskable), theme_color, background_color, `display: 'standalone'`.
- `src/app/icon.svg`: derived from `public/claw-logo.svg` (copied/adapted, not regenerated art).
- `src/app/apple-icon.png`: generated at build time via `next/og` `ImageResponse` sized 180×180 from the same mark (avoids needing an external image tool / binary asset review).
- `src/app/opengraph-image.tsx`: `next/og` `ImageResponse`, 1200×630, ClawAI logo + name + "Local-first AI orchestration" tagline, no user data, no chat content — matches §6 of the parent spec.
- `src/app/not-found.tsx`: uses the existing i18n system for copy, `export const metadata = { robots: { index: false } }`, links back to `/`.

### 4.8 Env / infra wiring (mandatory checklist)

- `.env.example` and `.env`: add `SITE_URL=` under a new "Public site / SEO" group, with a comment that production requires a real HTTPS domain and the app fails validation without one being explicitly set (dev falls back safely).
- `scripts/install.sh` / `scripts/install.ps1`: add `SITE_URL` to the generated `.env` block (defaulted to `https://claw.local` for local dev, matching `NEXT_PUBLIC_APP_URL`'s existing pattern).
- All split docker compose files: add `SITE_URL` to the frontend service's `environment`/`env_file`-driven vars (it already reads `env_file: .env`, so this is a documentation/consistency addition, not new plumbing — confirmed against the existing `NEXT_PUBLIC_APP_URL` wiring pattern during implementation).
- `CLAUDE.md`: add `SITE_URL` to the Environment Variables section; add a short note in Workspace Layout / Frontend Pages about the new `(marketing)` route group; note the portal layout split (server `layout.tsx` + client `PortalShell`).

### 4.9 What is intentionally NOT touched

- No changes to `(portal)` page files, hooks, components, or the sidebar/topbar.
- No changes to `next.config.mjs` headers beyond what's strictly needed (Phase A adds no new response headers there; the `X-Robots-Tag` work happens in middleware, and CSP is explicitly Phase F).
- No changes to the i18n locale list, translation files, or the authenticated `LocaleSwitcher`'s existing behavior (only a presentational extraction, behavior-preserving).
- No changes to auth, tokens, or the login/register forms.

## 5. Data flow

```
Registry (constants/content-registry.constants.ts)
   │
   ├─→ MarketingHeader / MarketingFooter nav  (getPublishedPages)
   ├─→ sitemap.ts                              (getIndexablePages)
   ├─→ robots.ts                                (published paths + generated private-prefix list)
   ├─→ middleware.ts → X-Robots-Tag             (isKnownPublicPath)
   └─→ page.tsx generateMetadata()              (getPageBySlug)
```

Single source of truth; every crawler-facing surface derives from the same array, so a page can never be "in the sitemap but not in nav" or "linked in the footer but noindexed."

## 6. Error handling

- `site-config.ts` never throws in a way that breaks dev/build: invalid/missing `SITE_URL` in non-production logs a warning (structured, via the frontend logger utility per the no-`console.log` rule) and falls back; in production it still renders (fail-open on canonical correctness is safer than a broken build), but `isProductionCanonical()` becomes `false`, which downstream code can use later (Phase E's ad-eligibility resolver will hard-require it — out of scope here, but the seam exists now).
- `not-found.tsx` handles genuinely unknown paths; the middleware `X-Robots-Tag` logic handles the "should this be indexed" question independently of whether the path 404s.
- Registry lookups (`getPageBySlug`) return `undefined` for unknown slugs; callers (metadata generation) fall back to safe generic noindex metadata rather than throwing.

## 7. Testing strategy

Vitest (frontend unit/component) + existing Playwright E2E setup:

1. **Routing**: `/` renders marketing content, does not redirect (assert no `redirect()` call / assert response is 200 with homepage markup, not a 3xx to `/chat`).
2. **Metadata**: homepage `generateMetadata()` returns a unique title/description/canonical; only one `<h1>` in rendered output.
3. **Registry integrity**: no duplicate `(slug, locale)` pairs; every `canonicalPath` is a valid absolute path; every `planned` entry has `indexability=NOINDEX` and `adEligibility=INELIGIBLE` (defense-in-depth helper test).
4. **Robots/sitemap**: `sitemap.ts` output contains only the homepage URL, fully qualified; `robots.ts` disallows all known private prefixes and references the sitemap; preview-mode `site-config` produces disallow-all.
5. **Portal noindex**: `(portal)/layout.tsx` exports `robots: { index: false }`; a middleware unit test asserts `X-Robots-Tag: noindex...` is set for a sample of portal/auth paths and absent for `/`.
6. **Unknown-path default**: `isKnownPublicPath('/some/random/path')` → `false`.
7. **Header/footer**: skip link present and focusable first; mobile menu opens/closes/traps focus/closes on Escape; footer only links to `published` pages (no dead links to `planned` slugs).
8. **Public locale switcher**: selecting a locale updates `document.documentElement.lang`/`dir` and does not call any authenticated mutation (mock `useUpdatePreferences` and assert it's never invoked from the marketing variant).
9. **Portal regression**: an existing guarded portal route (e.g. `/dashboard` behind `useAuthGuard`) still renders its loading state, then content, unchanged from current behavior — proves the `PortalShell` extraction is behavior-preserving.
10. **SITE_URL validation**: rejects `http://localhost:3000` and a Vercel preview-shaped URL as production canonical; accepts a valid `https://` domain.

## 8. Relationship to the full 6-phase program

This spec covers **Phase A** only, per the approved decomposition:

| Phase             | Scope                                                                                                                                                                        |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A (this spec)** | Public/private route architecture, homepage, registry, crawler metadata plumbing, header/footer                                                                              |
| B                 | ~29 additional editorial/guide/legal content pages, JSON-LD depth, breadcrumbs                                                                                               |
| C                 | Locale expansion to 13 (fa/th/zh-CN/ja), localized public URLs + hreflang, script-aware fonts, backend `UserLanguagePreference` HI fix                                       |
| D                 | `rememberMe` end-to-end, token-storage migration off localStorage, password-manager hardening, `https://claw.local` verification (independent, may run before/parallel to A) |
| E                 | AdSense eligibility engine (config-gated, off by default), `ads.txt`, contact form + email adapter, consent/CMP integration point                                            |
| F                 | Nonce CSP + HSTS, WCAG 2.2 AA full pass, Lighthouse CI + budgets, `quality:*`/`release:preflight` scripts, doc/rules/skills sync                                             |

Each phase gets its own spec → plan → implementation → full quality-gate cycle, committed independently.

## 9. Self-review corrections applied

- Replaced the `'published' | 'planned'` string literal union with a proper `ContentLifecycleStatus` enum to comply with the codebase's absolute rule #3 (no string literal unions for domain values) — caught during self-review, corrected in §4.4 above (the type alias line is kept only as a documentary note of the rejected approach).
- Clarified that the theme toggle needs no extraction (verified it's already auth-independent) to avoid speculative refactoring not required by the goal.
- Clarified `SITE_URL` docker-compose wiring is additive documentation/consistency (service already loads `env_file: .env`), not new plumbing — avoids overstating the infra diff.
