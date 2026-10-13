# 63 — Docs move with code

**Status:** active, **NON-NEGOTIABLE** · **Owner:** tooling · **Introduced:** 2026-10-13 ·
**ADR:** [ADR-170](../docs/13-adr/adr-170-agents-md-is-the-canonical-router.md)

## The rule

**Every change that touches the codebase leaves every document that describes it
accurate, in the same commit.**

It applies to every code change, every commit and every push: source, config,
scripts, hooks, CI workflows, Dockerfiles, Prisma schemas, environment variables,
dependencies and tooling.

In the same commit, the author — person or agent — must:

1. **Find every document that describes what changed**: the behaviour, command,
   path, rule, skill, script, env var, endpoint, event, schema or count. Documents
   are `rules/`, `skills/`, `agents/`, `context/`, `memory/`, `testing/`, `docs/`,
   `wiki/`, the root `*.md` files, the per-model agent files, each workspace's
   `AGENTS.md`/`CLAUDE.md`/`README.md`, `.env.example`, the PR template and
   `CONTRIBUTING.md`.
2. **Make them match the new reality**, and delete any instruction the change made
   obsolete. Stale guidance is a defect, not a cosmetic issue.
3. **Regenerate generated docs through their generators**, never by hand
   (`.ai/**`, workspace `AGENTS.md`, the per-model router files, generated wiki
   mirrors — the pre-commit hook does this).
4. **Declare the docs impact in the commit message trailer**:
   - `Docs: updated <what you updated>` — the commit changes at least one doc;
   - `Docs: none — <specific reason>` — at least three words saying why no
     document describes this change. A bare `Docs: none` is invalid.

   A commit may carry both: `updated` for the docs it changed and `none — <reason>`
   for an area it touched that no document describes.

Stale docs you find while working on anything else are fixed in that change, or
recorded as a tracked follow-up (an entry in
[`docs/14-risk-debt/`](../docs/14-risk-debt/) or the PR's follow-up list). They are
never silently ignored.

"I'll update the docs in a follow-up" is prohibited, except through a
[rules/25](25-exceptions-and-waivers.md) waiver with an owner and a date.

## Living, historical and generated docs

- **Living** docs describe the repository as it is now. Every check below applies.
- **Historical** docs are dated records of what was true when they were written:
  `docs/qa-evidence/`, ADRs (`docs/13-adr/`, `docs/adrs/`), `docs/changes/`,
  `docs/superpowers/`, `docs/implementation/`, the coding-agent lab ledger,
  `memory/`, `work/` and changelogs. They are not rewritten to match today; a
  living doc may not send a reader to them for current facts.
- **Generated** docs carry a `<!-- GENERATED … -->` first line (or live under
  `.ai/` / are a workspace `AGENTS.md`). Their generator's input is what gets
  checked; the output is verified fresh.

The list is code: [`tools/knowledge/docs-policy.mjs`](../tools/knowledge/docs-policy.mjs).

## What enforces it

| Check         | Where                                                   | Fails when                                                                                                                                                       |
| ------------- | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs:impact` | `commit-msg` hook (staged files); CI on every PR commit | a mapped code area changed and none of its docs did, without a reasoned `Docs: none`; the trailer is missing, bare or vague                                      |
| `docs:refs`   | `knowledge:verify` (pre-commit, pre-push, CI)           | a living doc links to a file that does not exist, names a missing repo path in code, an `npm run` script nobody defines, or an `npx` command not in the lockfile |
| counts        | `knowledge:verify`                                      | a living doc hand-writes a total of services, workspaces, spec files, Prisma clients or shared packages outside a generated `<!-- count:… -->` fragment          |
| duplication   | `knowledge:verify`                                      | ten or more identical lines appear in two living docs — one of them must link to the other                                                                       |

The code-to-docs map is [`tools/knowledge/docs-impact.mjs`](../tools/knowledge/docs-impact.mjs):
each workspace's `src/` maps to its `CLAUDE.md`, `README.md` and service guide; the
hooks and gate runner map to rules 23/34/48 and `AGENTS.md`; workflows to rules/23
and the CI pipeline doc; Prisma schemas to the data docs and rules/52; env vars to
`.env.example` and the env docs; root scripts to the toolchain docs. The failure
message names the docs to review.

An intentional example in a fenced block (a path or command that is meant not to
exist) is preceded by the line `<!-- docs:example -->`.

Counts come from the manifests. Write
`<!-- count:services -->20<!-- /count -->` and `npm run knowledge:build` keeps the
number current; the keys are `services`, `workspaces`, `sharedPackages`,
`specFiles` and `prismaClients`.

## Prohibited

- A commit with no `Docs:` trailer, a bare `Docs: none`, or `Docs: none — n/a`.
- Leaving an instruction in place that the change made wrong.
- Hand-editing a generated doc, or hand-writing a repository total.
- Copying a section into a second doc instead of linking to it.
- "Docs in a follow-up" without a rules/25 waiver.

## Tests

`tools/__tests__/docs-checks.test.mjs` (refs, counts, duplication, impact map,
trailers).

## Related

[rules/33](33-knowledge-compounding-and-context-velocity.md) (knowledge delta) ·
[rules/24](24-generated-files-and-knowledge-freshness.md) (generated files) ·
[rules/23](23-git-commits-hooks-and-release-gates.md) (landing a change).
