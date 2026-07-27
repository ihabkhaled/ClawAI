# Public Marketing and SEO Launch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Launch a factual, conversion-focused, fully discoverable 16-page public site across all 13 locales with premium technical-editorial presentation.

**Architecture:** The content registry remains the single public-page authority. Technical discovery helpers derive metadata, robots, sitemaps, feeds, navigation, and audit coverage from it; page components compose focused server-rendered marketing primitives and localized dictionaries.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript/tsgo, Tailwind CSS, next/image, Vitest, Testing Library, Lighthouse CI, Vercel.

## Global Constraints

- Subscription-first positioning with a distinct enterprise/private-deployment path.
- Publish exactly the existing eight pages plus About, Pricing, Supported Models, Security & Privacy, Privacy, Terms, Cookies, and Acceptable Use.
- Support all 13 repository locales with real translations for every new user-facing string.
- Never invent testimonials, customer logos, metrics, uptime, certifications, benchmarks, or endorsements.
- Preserve authenticated application behavior and keep portal/auth routes noindex.
- Use tests first and observe the expected failure before production changes.
- Use only repository facts for model access, pricing, security, and architecture claims.
- Maintain responsive, keyboard, RTL, dark-mode, and reduced-motion behavior.
- Do not bypass hooks or generated-artifact gates.

---

### Task 1: Repair the technical discovery foundation

**Files:**

- Modify: `apps/claw-frontend/src/__tests__/middleware.test.ts`
- Modify: `apps/claw-frontend/src/app/__tests__/robots.test.ts`
- Modify: `apps/claw-frontend/src/app/__tests__/sitemap.test.ts`
- Modify: `apps/claw-frontend/src/lib/discovery/__tests__/rss.service.test.ts`
- Modify: `apps/claw-frontend/src/lib/seo/__tests__/public-page-metadata.test.ts`
- Modify: `apps/claw-frontend/src/utilities/__tests__/public-shared-chat.utility.test.ts`
- Modify: `apps/claw-frontend/src/middleware.ts`
- Modify: `apps/claw-frontend/src/constants/private-route-prefixes.constants.ts`
- Modify: `apps/claw-frontend/src/lib/discovery/rss.service.ts`
- Modify: `apps/claw-frontend/src/lib/seo/public-page-metadata.ts`
- Modify: `apps/claw-frontend/src/utilities/structured-data.utility.ts`

**Interfaces:**

- Produces: reachable localized RSS endpoints, exhaustive feed items, private-route robots coverage, localized shared-chat JSON-LD, RSS autodiscovery metadata.
- Consumes: `PUBLIC_CONTENT_DEFINITIONS`, `SUPPORTED_LOCALES`, and existing site-config fail-closed behavior.

- [ ] Write failing tests proving localized feed URLs resolve through middleware, `/billing` is disallowed, RSS does not truncate eligible entries, metadata advertises RSS, and shared-chat JSON-LD uses the content language.
- [ ] Run the focused tests and verify each fails for the missing behavior.
- [ ] Implement the smallest discovery changes that satisfy those tests without changing portal routing.
- [ ] Run the focused tests, then the complete frontend test suite.
- [ ] Run typecheck, lint, and the production build.

### Task 2: Make metadata truthful and locale-native

**Files:**

- Modify: `apps/claw-frontend/src/types/content-registry.types.ts`
- Modify: `apps/claw-frontend/src/constants/content-registry.constants.ts`
- Modify: `apps/claw-frontend/src/lib/i18n/locales/en.ts`
- Modify: all 12 non-English files under `apps/claw-frontend/src/lib/i18n/locales/`
- Modify: `apps/claw-frontend/src/lib/seo/public-page-metadata.ts`
- Modify: `apps/claw-frontend/src/lib/seo/__tests__/public-page-metadata.test.ts`
- Modify: `apps/claw-frontend/src/app/__tests__/sitemap-coverage.test.ts`

**Interfaces:**

- Produces: `LocalizedContentMetadata` with localized title, description, and keywords for every published locale.
- Consumes: locale dictionaries and root title template.

- [ ] Write failing tests requiring every published locale to have non-empty native metadata, unique canonical paths, non-duplicated rendered brand titles, and useful keyword arrays.
- [ ] Run the tests and confirm failures identify the English-copy behavior.
- [ ] Move SEO content into locale-owned metadata records and generate registry entries from those records.
- [ ] Normalize child titles so the root `%s | ClawAI` template renders the brand once.
- [ ] Run metadata, registry, sitemap, and locale-integrity tests.

### Task 3: Publish the trust and conversion page registry

**Files:**

- Modify: `apps/claw-frontend/src/enums/content-category.enum.ts`
- Modify: `apps/claw-frontend/src/constants/content-registry.constants.ts`
- Modify: `apps/claw-frontend/src/constants/marketing-nav.constants.ts`
- Modify: `apps/claw-frontend/src/app/__tests__/sitemap-coverage.test.ts`
- Modify: `apps/claw-frontend/src/app/__tests__/lighthouse-coverage.test.ts`
- Modify: `apps/claw-frontend/lighthouserc.json`

**Interfaces:**

- Produces: 16 published definitions and deterministic launch-page navigation groups.
- Consumes: localized metadata from Task 2.

- [ ] Write failing registry tests for the exact 16-page launch set and unique locale-aware navigation/footer entries.
- [ ] Run the tests and confirm the eight missing routes fail.
- [ ] Publish the eight new definitions with correct categories, relationships, indexability, and review dates.
- [ ] Extend Lighthouse coverage to the launch set plus representative Arabic and Japanese mobile URLs.
- [ ] Run registry, sitemap, navigation, and Lighthouse-coverage tests.

### Task 4: Build reusable editorial page primitives

**Files:**

- Create: `apps/claw-frontend/src/components/marketing/shared/editorial-page-shell.tsx`
- Create: `apps/claw-frontend/src/components/marketing/shared/editorial-section-nav.tsx`
- Create: `apps/claw-frontend/src/components/marketing/shared/evidence-note.tsx`
- Create: `apps/claw-frontend/src/components/marketing/shared/routing-rail.tsx`
- Create: `apps/claw-frontend/src/types/marketing-editorial.types.ts`
- Create: `apps/claw-frontend/src/components/marketing/shared/__tests__/editorial-primitives.test.tsx`
- Modify: `apps/claw-frontend/src/app/globals.css`
- Modify: `apps/claw-frontend/src/app/layout.tsx`

**Interfaces:**

- Produces: server-first editorial shell, in-page navigation, evidence annotation, and accessible routing diagram.
- Consumes: localized strings passed as props; no translation hook inside static primitives.

- [ ] Write failing component tests for headings, landmarks, section navigation, diagram text alternatives, keyboard links, and reduced-motion-safe markup.
- [ ] Run the tests and confirm components are missing.
- [ ] Implement the primitives with the premium technical-editorial tokens and responsive behavior.
- [ ] Run component tests, lint, and typecheck.

### Task 5: Build About, Pricing, Supported Models, and Security pages

**Files:**

- Create: `apps/claw-frontend/src/app/(marketing)/about/page.tsx`
- Create: `apps/claw-frontend/src/app/(marketing)/pricing/page.tsx`
- Create: `apps/claw-frontend/src/app/(marketing)/supported-models/page.tsx`
- Create: `apps/claw-frontend/src/app/(marketing)/security-and-privacy/page.tsx`
- Create focused components under matching folders in `apps/claw-frontend/src/components/marketing/`
- Create page tests under each route’s `__tests__/` directory
- Modify all 13 locale dictionaries and `apps/claw-frontend/src/lib/i18n/i18n.types.ts`

**Interfaces:**

- Produces: four server-rendered public pages with metadata, visible evidence, primary/secondary CTAs, and no unsupported claims.
- Consumes: editorial primitives, plan/provider constants, and registry metadata.

- [ ] Write failing page tests for one `h1`, core sections, factual disclaimers, preserved registration/contact intent, and metadata.
- [ ] Run tests and confirm the routes/components are absent.
- [ ] Implement English content from repository facts and real translations in all 12 other locale dictionaries.
- [ ] Implement route components and page-specific structured data supported by visible content.
- [ ] Run route tests, locale-integrity tests, typecheck, lint, and build.

### Task 6: Build Privacy, Terms, Cookies, and Acceptable Use

**Files:**

- Create: `apps/claw-frontend/src/app/(marketing)/privacy/page.tsx`
- Create: `apps/claw-frontend/src/app/(marketing)/terms/page.tsx`
- Create: `apps/claw-frontend/src/app/(marketing)/cookies/page.tsx`
- Create: `apps/claw-frontend/src/app/(marketing)/acceptable-use/page.tsx`
- Create: `apps/claw-frontend/src/components/marketing/legal/legal-page.tsx`
- Create tests under `apps/claw-frontend/src/app/(marketing)/*/__tests__/`
- Modify all 13 locale dictionaries and `apps/claw-frontend/src/lib/i18n/i18n.types.ts`
- Modify: `apps/claw-frontend/src/components/marketing/marketing-footer.tsx`

**Interfaces:**

- Produces: four linked legal/trust pages with effective date `2026-07-27`.
- Consumes: actual contact, storage, billing, cookie, provider-processing, and account-deletion behavior.

- [ ] Write failing tests requiring all four routes, footer links, effective dates, contact paths, and policy cross-links.
- [ ] Run tests and confirm routes and footer legal links are missing.
- [ ] Implement factual policies without claiming certifications or legal guarantees.
- [ ] Add real translations in all locales.
- [ ] Run legal page, footer, locale, metadata, sitemap, and build tests.

### Task 7: Repair conversion paths and contact accessibility

**Files:**

- Modify: `apps/claw-frontend/src/components/marketing/home/plan-tier-card.tsx`
- Modify: `apps/claw-frontend/src/components/marketing/marketing-header.tsx`
- Modify: `apps/claw-frontend/src/components/marketing/marketing-mobile-menu.tsx`
- Modify: `apps/claw-frontend/src/components/marketing/contact/contact-form.tsx`
- Modify: `apps/claw-frontend/src/hooks/marketing/use-contact-form.ts`
- Modify: `apps/claw-frontend/src/lib/validation/contact.schema.ts`
- Modify: `apps/claw-frontend/src/app/api/contact/route.ts`
- Modify relevant tests beside those files
- Modify all locale dictionaries for new form labels and messages

**Interfaces:**

- Produces: plan-aware registration URLs, enterprise-aware contact URLs, accessible field errors, and persistent API failure feedback.
- Consumes: existing anti-spam, rate limiting, sanitization, and mail-delivery pipeline.

- [ ] Write failing tests for preserved plan/interval/intent, unique responsive navigation, `aria-current`, error associations, live announcements, and first-error focus.
- [ ] Run focused tests and confirm failures.
- [ ] Implement query-safe conversion context and accessible error behavior without weakening validation or anti-spam controls.
- [ ] Run contact API, schema, component, header, and registration tests.

### Task 8: Refine existing public pages and shared-chat acquisition

**Files:**

- Modify pages and focused components under `apps/claw-frontend/src/app/(marketing)/` and `apps/claw-frontend/src/components/marketing/`
- Modify: `apps/claw-frontend/src/app/(marketing)/share/chat/[publicShareId]/page.tsx`
- Modify: `apps/claw-frontend/src/utilities/public-shared-chat.utility.ts`
- Modify relevant route/component tests
- Modify all locale dictionaries for changed copy

**Interfaces:**

- Produces: concise homepage, outcome-led topic pages, local section navigation, diagrams, and a restrained shared-chat signup CTA.
- Consumes: editorial primitives and factual copy established in Tasks 4–7.

- [ ] Write failing tests for the revised CTA hierarchy, local navigation, factual plan copy, and shared-chat acquisition link.
- [ ] Run tests and confirm existing pages lack the behavior.
- [ ] Remove contradictory/repetitive copy and apply the editorial layout without deleting substantive product information.
- [ ] Add diagrams and interface illustrations with text alternatives.
- [ ] Run all marketing and shared-chat tests.

### Task 9: Close locale, accessibility, and responsive gaps

**Files:**

- Modify: `apps/claw-frontend/src/app/(auth)/layout.tsx`
- Modify auth form components and schemas identified by the audit
- Modify: `apps/claw-frontend/lighthouserc.json`
- Modify: `apps/claw-frontend/tests/e2e/responsive-shell.spec.ts`
- Create or modify locale-integrity and accessibility tests

**Interfaces:**

- Produces: complete native marketing/public-share text for `fa`, `ja`, `th`, and `zh`; valid auth landmarks/headings; mobile and locale Lighthouse coverage.
- Consumes: final public route inventory and translations from previous tasks.

- [ ] Write failing tests that reject inherited English marketing/public-share namespaces and invalid auth form semantics.
- [ ] Run tests and verify the known audit gaps fail.
- [ ] Complete native translations and auth semantic fixes.
- [ ] Add representative mobile, RTL, and CJK browser/Lighthouse coverage.
- [ ] Run locale, auth, accessibility, responsive, and Lighthouse configuration tests.

### Task 10: Final verification and deployment

**Files:**

- Regenerate: `.ai/**`, workspace `AGENTS.md`, and `docs/features/ai-native-engineering-os/inventory.snapshot.json`

**Interfaces:**

- Produces: a deployable, audited release candidate.
- Consumes: all previous tasks.

- [ ] Run frontend format check, typecheck, lint, full tests, and production build.
- [ ] Run Lighthouse CI for every configured public URL.
- [ ] Run `npm run knowledge:build`, `npm run audit`, `npm run knowledge:verify`, and `npm run audit:check`.
- [ ] Run `npm run affected:list` and inspect the complete diff for generated or unrelated changes.
- [ ] Commit with hooks enabled, push immediately, and monitor CI, CodeQL, Lighthouse, and Vercel until green.
- [ ] Inspect production robots, sitemap index/children, RSS feeds, metadata, contact flow, responsive layouts, and representative localized pages.
