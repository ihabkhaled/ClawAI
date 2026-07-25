# Lighthouse CI (marketing performance budget)

The public marketing surface is guarded by a Lighthouse budget gate so
performance, accessibility, best-practices, and SEO cannot silently regress.

## What runs

`.github/workflows/lighthouse.yml` builds the frontend and runs
`@lhci/cli autorun` (config: `apps/claw-frontend/lighthouserc.json`) against
`/` and `/contact`, 3 runs each, desktop preset. It triggers only when the
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
