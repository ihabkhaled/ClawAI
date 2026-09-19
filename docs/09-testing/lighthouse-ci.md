# Lighthouse CI (marketing performance budget)

The public marketing surface is guarded by a Lighthouse budget gate so
performance, accessibility, best-practices, and SEO cannot silently regress.

## What runs

`.github/workflows/lighthouse.yml` builds the frontend and runs
`@lhci/cli autorun` against every published public page — 108 URLs as of the
`/learn`, `/integrations`, `/model-providers`, `/model-fit`, `/use-cases`,
`/features` and `/prompts` clusters, 2 runs each, desktop preset. It triggers
only when the frontend or the Lighthouse config changes, so backend PRs are
unaffected.

The workflow runs one of two configs depending on the trigger: pushes to `main`
run `lighthouserc.json` (all 108 URLs); pull requests run `lighthouserc.pr.json`,
a **derived sample** — see "Pull-request sampling" below. Never edit
`lighthouserc.pr.json` by hand; it is generated.

## Budgets (`lighthouserc.json`)

| Category       | Level | Min score |
| -------------- | ----- | --------- |
| Performance    | warn  | 0.90      |
| Accessibility  | error | 1         |
| Best practices | error | 1         |
| SEO            | error | 1         |

Performance is a **warning**, not an error: LHCI scores vary run-to-run on
shared CI runners, and a hard perf gate is flaky. Accessibility / best-practices
/ SEO are deterministic and gate hard. Specific audits (`meta-description`,
`document-title`, `html-has-lang`, `is-crawlable`, `color-contrast`,
`image-alt`) are asserted individually so a regression names the exact failure.

## Why `SITE_URL` is set in the job

`site-config.ts` forces every page to `noindex` unless `SITE_URL` is a valid
canonical https origin (localhost is rejected). The workflow sets
`SITE_URL=https://claw.example` so the pages render indexable and the SEO audit
is meaningful; Lighthouse still browses `http://localhost:3000`.

## Why a pricing fixture runs in the job

The job has no backend. Without one, `/en` and `/en/pricing` render the honest
"pricing unavailable" state. The browser then logs `/api/pricing`'s 503 as a
console error, `errors-in-console` fails, and best-practices drops to 0.96.
That kept the gate red on main from at least 2026-09-17 to 2026-09-19, and it
audited an error state instead of the page users see.

`apps/claw-frontend/scripts/lighthouse-pricing-fixture.mjs` stands in for
auth-service's `/api/v1/internal/plans/catalog`. It listens on 127.0.0.1:4901
and requires the service token, like the real route. The audit step points
`AUTH_SERVICE_URL` and `INTER_SERVICE_AUTH_TOKEN` at it. The plans are labelled
test data. `tools/__tests__/lighthouse-pricing-fixture.test.mjs` fails if the
workflow stops wiring the fixture, or if a plan loses a field the page renders.

**If a page fails `errors-in-console`, find the failing request first**
(`audits['errors-in-console'].details.items[].sourceLocation.url` in the JSON
report). A page that depends on the backend needs a fixture here, not a
weaker assertion.

## Running locally

To reproduce the job's pricing pages, start the fixture and pass the same two
variables to `next start`:

```bash
cd apps/claw-frontend
PORT=4901 SERVICE_TOKEN=lighthouse-fixture node scripts/lighthouse-pricing-fixture.mjs &
AUTH_SERVICE_URL=http://127.0.0.1:4901 INTER_SERVICE_AUTH_TOKEN=lighthouse-fixture \
  SITE_URL=https://claw.example npx next start -p 3100
```

The whole run:

```bash
npm run build:frontend          # produce the production build first
npm run lighthouse              # runs @lhci/cli via npx against the built app
```

`@lhci/cli` is intentionally NOT a dependency (it pulls Chromium) — it is run
on-demand via `npx`. Reports land in `apps/claw-frontend/.lighthouseci`
(gitignored; uploaded as a CI artifact).

## Which pages are audited

Every **published, indexable** page in `CONTENT_REGISTRY` — 108 today, and
growing as SEO clusters land (`docs/05-frontend/seo-content-architecture.md`
tracks the full build plan). This includes both hand-authored launch pages
(`/en/features`, `/en/architecture`, …) and every page a dynamic cluster
generates (`/en/learn/what-is-rag`, `/en/integrations/github`, …) — a cluster
route is one file on disk standing for many pages, and every one of them still
needs its own audited URL.

Only reviewed/indexable locale variants are audited. A locale must not be added
to Lighthouse merely to satisfy a matrix: doing so would either audit an
untranslated English fallback or require weakening the crawlability gate.
Registry coverage tests fail if a published English logical page is absent or
if an unprefixed/private/orphaned route enters the matrix.

This list used to be `/` and `/contact` only. When the six topic pages were
published the config was not updated, so they shipped with **no accessibility
or SEO gate at all** — and nothing failed to say so, because Lighthouse only
reports on URLs it is told to visit.

`src/app/__tests__/lighthouse-coverage.test.ts` now ties the two together in
both directions:

- a new public page that is not audited fails the test;
- a URL in the config with no page behind it fails too, because that run 404s
  and drags the whole audit's score into meaninglessness.

`numberOfRuns` is 2 rather than 3: at 3 runs the full-page audit would take
noticeably longer for no gain on the hard gates (accessibility, best-practices,
SEO are deterministic; only the performance score, a _warning_, is noisy). Two
runs still yields a median to damp that variance.

## Pull-request sampling

The audit is **linear in URL count**, measured at roughly 13.9 seconds per
audit (28 URLs × 2 runs ≈ 13 minutes, observed before the `/learn` cluster
landed) — which rounds to **minutes ≈ URLs × 0.46** (`.github/workflows/lighthouse.yml`
records the same formula next to its `concurrency`/`timeout-minutes` guards).
At 108 URLs × 2 runs that is already ~50 minutes; every cluster this repo adds
makes it worse, and `minScore: 1` on three categories means
**one flaky audit anywhere in the set fails the entire run** — so a larger set
is not just slower, it is proportionally more likely to red a PR for a page the
PR never touched.

Pull requests therefore audit `lighthouserc.pr.json`, a sample derived by
`tools/lighthouse/build-pr-config.mjs`: group the full URL list by its first
path segment after the locale (so every cluster and every standalone page is
its own group), keep at most 2 URLs per group. This guarantees every cluster
keeps _some_ coverage on every PR — a bug affecting all of `/learn` cannot slip
through because only 2 of its 31 pages happen to be sampled — while capping the
sample's growth as clusters grow.

`main` still runs the full 108-URL set on every push, so nothing ships
ultimately ungated; the sample only relaxes what has to pass before a PR merges.

Regenerate the sample after adding a URL to `lighthouserc.json`:

```bash
node tools/lighthouse/build-pr-config.mjs
```

`lighthouse-coverage.test.ts` asserts `lighthouserc.pr.json` is exactly what
the generator would currently produce — a hand-edited or stale sample fails
that test, so the two files cannot drift apart silently.
