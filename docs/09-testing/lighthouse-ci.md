# Lighthouse CI (marketing performance budget)

The public marketing surface is guarded by a Lighthouse budget gate so
performance, accessibility, best-practices, and SEO cannot silently regress.

## What runs

`.github/workflows/lighthouse.yml` builds the frontend and runs
`@lhci/cli autorun` (config: `apps/claw-frontend/lighthouserc.json`) against
all eight published public pages, 2 runs each, desktop preset. It triggers only when the
frontend or the Lighthouse config changes, so backend PRs are unaffected.

## Budgets (`lighthouserc.json`)

| Category       | Level | Min score |
| -------------- | ----- | --------- |
| Performance    | warn  | 0.90      |
| Accessibility  | error | 0.95      |
| Best practices | error | 0.95      |
| SEO            | error | 0.95      |

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

## Running locally

```bash
npm run build:frontend          # produce the production build first
npm run lighthouse              # runs @lhci/cli via npx against the built app
```

`@lhci/cli` is intentionally NOT a dependency (it pulls Chromium) — it is run
on-demand via `npx`. Reports land in `apps/claw-frontend/.lighthouseci`
(gitignored; uploaded as a CI artifact).

## Which pages are audited

Every **published, indexable** page in `CONTENT_REGISTRY` — eight today:
`/`, `/features`, `/how-it-works`, `/architecture`, `/use-cases`, `/faq`,
`/local-first-ai`, `/contact`.

This list used to be `/` and `/contact` only. When the six topic pages were
published the config was not updated, so they shipped with **no accessibility
or SEO gate at all** — and nothing failed to say so, because Lighthouse only
reports on URLs it is told to visit.

`src/app/__tests__/lighthouse-coverage.test.ts` now ties the two together in
both directions:

- a new public page that is not audited fails the test;
- a URL in the config with no page behind it fails too, because that run 404s
  and drags the whole audit's score into meaninglessness.

`numberOfRuns` is 2 rather than 3: eight pages at three runs is roughly eight
minutes of CI. Two runs still yields a median to damp run-to-run variance, and
the hard gates (accessibility, best-practices, SEO) are deterministic anyway —
it is only the performance score, which is a _warning_, that is noisy.
