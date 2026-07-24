# ESLint architecture

The root `eslint.config.mjs` is the active, finely-tuned config that gates all
24 workspaces today (typescript-eslint strict, security, unicorn, import-x, plus
ClawAI's `no-restricted-syntax` inline-declaration bans and per-file overrides).
It is intentionally **not rewritten** — rewriting a working repo-wide lint config
without a full 24-workspace lint run is how you break everyone at once.

This folder adds the **architecture enforcement layer** as opt-in, tested modules
that ratchet in per workspace rather than flipping the whole repo in one commit.

## Files

- `architecture.config.mjs` — the SINGLE source of truth for layer definitions,
  workspace patterns, backend layer dependency policy, package ownership, config
  file patterns, and file-size budgets. The knowledge tooling reads the same
  definitions, so conventions are never defined twice (rule 23 / rule 26).
- `architecture-plugin/` — a real ESLint plugin with tested custom rules:
  - `no-cross-service-internal-imports` — a service may not import another
    service's `src` (cross-service = HTTP or RabbitMQ only).
  - `controller-no-logic` — no try/catch, no throw, ≤3-statement methods in
    `*.controller.ts`.
  - `repository-no-throw` — no `throw` in `*.repository.ts`.
  - `no-process-env-outside-config` — `process.env` only in the config layer.
    Each rule has valid/invalid fixtures and RuleTester unit tests
    (`architecture-plugin/__tests__/rules.test.mjs`). Run: `npm run architecture:check`.

## Target split (documented structure)

The intended end-state decomposes the root orchestrator into composable modules
(`eslint/base.config.mjs`, `typescript.config.mjs`, `security.config.mjs`,
`backend.config.mjs`, `frontend.config.mjs`, `react.config.mjs`,
`tests.config.mjs`, `architecture.config.mjs`, `package-boundaries.config.mjs`,
`architecture-plugin/`). The root then only composes them in a documented order.
That extraction is a mechanical, lint-verified follow-up slice — see
`docs/13-adr/` (split-ESLint ADR) — so the extraction can be proven behaviour-
preserving with a full lint run before it lands.

## Adoption ratchet (no big-bang)

1. `import { recommended } from './eslint/architecture-plugin/index.mjs'` into the
   root config, scoped to ONE service's `src`.
2. Run that service's `npm run lint`; fix real violations (do not suppress).
3. Widen the `files` glob one service at a time until all 17 are covered.
4. Only then promote the plugin block to the whole `apps/claw-*-service` glob.

Because the rules are `error` inside the opt-in `recommended` config but that
config is not yet wired into the root, existing lint is unaffected until a human
adopts it deliberately. This is the "extend, don't parallelize" mindset applied
to lint.
