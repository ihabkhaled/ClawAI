---
name: inspect-affected-workspaces
summary: Determine exactly which workspaces a change touches (directly and via dependents) before running any gate, using the affected-workspace engine.
task_keywords: [affected, impact, which workspaces, blast radius, dependents, scope, gate scope]
applies_to: [all-workspaces, monorepo-root]
required_rules: [02-monorepo-and-workspace-ownership, 23-git-commits-hooks-and-release-gates]
required_context: [workspace-map, service-dependency-map, stack-and-toolchain]
affected_workspaces: [none-read-only]
required_tests: [none-read-only]
required_docs: [none]
validation_lane: npm run affected:list
---

## When to use

Before running any gate (typecheck/lint/test/build) or committing, to confirm
the scope of validation — never guess, and never default to "all 24
workspaces" out of caution. This is the mechanical backbone of
[`../rules/23-git-commits-hooks-and-release-gates.md`](../rules/23-git-commits-hooks-and-release-gates.md).

## When NOT to use

For a release, skip this and run `npm run release:preflight` instead — that
lane intentionally validates broadly, by design, not by affected-scope.

## Read first

- [`../context/service-dependency-map.md`](../context/service-dependency-map.md)
- `tools/affected/index.mjs` — the engine itself

## Repository discovery steps

1. Run `npm run affected:list` (optionally `-- --base=<branch>`).
2. Read the reasons printed for each workspace: `direct edit: <file>` or
   `depends on changed package <name>`.
3. If the output says `[root invariant]`, your diff touched root config,
   infra, docker, nginx, or governance files — local hooks stay scoped to the
   directly-affected workspaces; the full pass runs in CI/`release:preflight`
   (pass `--all-on-root` to force the broad pass locally if you need it).

## Tests-first plan

N/A — this is a discovery step, not a code change.

## Implementation steps

1. `npm run affected:list` before you start editing (baseline).
2. Re-run after each meaningful edit if you're unsure whether you widened scope
   (e.g. by editing a shared package).
3. Use the printed workspace list to run only those workspaces' gates:
   `npm run affected:lint`, `affected:typecheck`, `affected:test`, `affected:build`
   — or the equivalent `cd <workspace> && npm run <script>` per workspace.

## Security considerations

None — read-only.

## Failure modes

- Editing a shared package and only testing the package itself, missing that
  every dependent service now needs revalidation — the engine handles this
  automatically (`depends on changed package` reason), don't override it.
- Assuming an empty `affected:list` means "nothing to do" when a root
  invariant was actually triggered — check for the `[root invariant]` marker.

## Validation commands

```
npm run affected:list
npm run affected:list -- --base=main
```

## Documentation updates

None.

## Definition of done

You know precisely which workspaces your change affects and why, before
running a single gate command.
