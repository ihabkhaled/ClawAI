> **Ported from:** [ihabkhaled/akinator-ai](https://github.com/ihabkhaled/akinator-ai)
> (`skills/everything/SKILL.md`). This page summarises the method for a reader
> who does not have the Akinator plugin installed; the ClawAI-native runbook
> lives at [`skills/apply-akinator-without-the-plugin.md`](https://github.com/ihabkhaled/ClawAI/blob/main/skills/apply-akinator-without-the-plugin.md),
> the non-negotiable subset at [`rules/55-akinator-station-discipline.md`](https://github.com/ihabkhaled/ClawAI/blob/main/rules/55-akinator-station-discipline.md).

# Akinator Method

Akinator's premise: a change is the code **plus** the knowledge that lets the
next agent act on it in seconds. Code shipped without the documentation, rule,
skill, context update or memory entry that explains it is only half a change.
ClawAI already believed this — see [[AI-Native-Engineering-OS]] — and this page
carries the method that makes it operational even in a session with no
`akinator` plugin available.

## The twelve stations

| # | Station | What it does |
|---|---|---|
| 1 | ASK | Raise every genuine ambiguity in one grouped, ranked message, each question defaulted, before planning starts |
| 2 | RESOLVE | Read the knowledge layer first — `CLAUDE.md`, `rules/`, `context/`, generated manifests — so no question is asked twice |
| 3 | AUDIT | Check a claimed capability against the code: done, partial, present-but-not-wired, or missing |
| 4 | PLAN | Cut the work into batches on real seams, and declare the knowledge delta by path before writing code |
| 5 | IMPLEMENT | Write the change, following the repository's own conventions |
| 6 | DOCUMENT | Update the relevant `docs/` page |
| 7 | SKILLIFY | Capture a repeatable procedure as a runbook under `skills/` |
| 8 | RULE | Capture a new constraint as a numbered rule with a real enforcement mechanism |
| 9 | CONTEXTIFY | Update the structural map under `context/` if the architecture moved |
| 10 | MEMOIZE | Record a lesson under `memory/` that isn't a rule or a doc |
| 11 | INDEX+SYNC | Make every new artifact reachable from its index, and keep the routers in sync |
| 12 | VERIFY | Run the gates once, scoped, and report the real exit code |
| every | WIKI | Land the change in this wiki too |

The full station-to-path mapping for this repository is
[`context/akinator-station-map.md`](https://github.com/ihabkhaled/ClawAI/blob/main/context/akinator-station-map.md).

## Standing rules

- Stations 6–11 happen in the **same batch** as the code — "document later" is
  a prohibited sentence.
- The knowledge delta is declared **by path** at plan time, or the batch states
  `knowledge delta: none — <reason>`.
- Never guess on money, permissions, deletion, security, or a public contract —
  ask, or cite the rule that already answers it.
- Gates run once, at the end, scoped to what changed — never per edit, never
  all-workspace.
- An unanswered question is written down as unknown, never invented.

## Why this is ported rather than installed

ClawAI's own knowledge layer — `rules/`, `skills/`, `context/`, `memory/`,
`.ai/` — already implements most of Akinator's discipline independently (see
[[Rules-Catalog]], [[Skills-Catalog]]). Porting the method as native ClawAI
documents means the discipline holds even in a session, tool, or CI job where
the `akinator` plugin was never installed, and it stays enforced by the same
mechanisms as everything else in this repository:
`npm run knowledge:coverage`, `npm run knowledge:verify`, and the pre-commit
hook — not by a mechanism that only exists inside the plugin.

## See also

- [[AI-Native-Engineering-OS]]
- [[Rules-Catalog]]
- [[Skills-Catalog]]
- [[Engineering-Memory]]
