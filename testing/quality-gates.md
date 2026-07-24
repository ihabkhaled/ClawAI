# Quality gates

The pass/fail bar a change must clear before merge and before release. Two
lanes exist — keep them separate; do not substitute one for the other.

## Local / PR lane — affected workspaces only

```bash
npm run affected:list
cd <touched-workspace> && npm run typecheck && npm run lint && npm test && npm run build
```

Runs only the workspaces your diff actually touches (plus dependents of a
changed shared package). This is what git hooks (`.husky/pre-commit`,
`.husky/pre-push`) and PR CI (`.github/workflows/ai-native-os.yml`) run. See
[coverage-policy.md](coverage-policy.md) for the coverage bar and
[../rules/22-testing-and-coverage.md](../rules/22-testing-and-coverage.md) for
the rule this gate enforces.

## Release lane — full repository

```bash
npm run release:preflight
```

Runs in dependency order and stops at the first failure: toolchain → audit
freshness → knowledge freshness/integrity → tooling tests → format → lint →
typecheck → test → build (all workspaces). See
[`tools/release/preflight.mjs`](../tools/release/preflight.mjs). This is the
ONLY place a broad, all-workspace run is the correct default — a release, not a
one-file PR.

## Non-negotiable gate rules

- Never skip a gate for a folder you changed.
- Never bypass a hook with `--no-verify` — see
  [../rules/23-git-commits-hooks-and-release-gates.md](../rules/23-git-commits-hooks-and-release-gates.md).
- Never expand a PR's local gate to all-workspace "to be safe" — that is what
  the release lane is for.
- A failing gate blocks merge/release regardless of how small the change looks.

## What each gate proves

| Gate                 | Proves                                                                                                 |
| -------------------- | ------------------------------------------------------------------------------------------------------ |
| `affected:lint`      | No new lint errors in touched code                                                                     |
| `affected:typecheck` | Types are sound in touched workspaces + dependents                                                     |
| `affected:test`      | Behaviour is verified; coverage bar met (see coverage-policy.md)                                       |
| `affected:build`     | Production build succeeds for touched workspaces                                                       |
| `knowledge:verify`   | Generated `.ai/` is fresh; no broken governance links; no hook-bypass; no high-severity contradictions |
| `architecture:check` | Custom ESLint architecture rules still pass their fixtures                                             |
| `release:preflight`  | All of the above, repository-wide, in order                                                            |

## Definition of done

A change is release-ready only when its affected-lane gates are green AND
`release:preflight` is green on the branch before merge to `main`.
