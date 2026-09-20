# Akinator station map

> Ported from the Akinator method (https://github.com/ihabkhaled/akinator-ai).
> Compact lookup for [`skills/apply-akinator-without-the-plugin.md`](../skills/apply-akinator-without-the-plugin.md)
> and [`rules/55-akinator-station-discipline.md`](../rules/55-akinator-station-discipline.md).
> Regenerate-or-review trigger: whenever the station list or a target path
> below stops matching the repo (a new knowledge-layer folder, a renamed
> index file, a plugin update this repo re-ports).

| Station | Asks | Output lands in |
|---|---|---|
| 1. ASK | What's ambiguous, and what does a wrong guess cost? | The response — a grouped, ranked, defaulted question battery |
| 2. RESOLVE | What does the layer already answer? | Read-only: `CLAUDE.md`, `rules/00-non-negotiable-rules.md`, `context/*`, `.ai/local/current-context.md` |
| 3. AUDIT | Done, partial, present-but-not-wired, or missing? | The plan/report; large audits → `docs/14-risk-debt/` |
| 4. PLAN | Batches, blast radius, knowledge delta by path | The response; flagship work → `docs/superpowers/plans/<date>-<slug>.md` |
| 5. IMPLEMENT | — | The repository's normal source layout (`apps/`, `packages/`) |
| 6. DOCUMENT | What's now true? | `docs/04-backend/service-guide-<name>.md`, `docs/03-architecture/*`, nearest existing doc |
| 7. SKILLIFY | Is this repeatable? | `skills/*.md` + a row in `skills/00-index.md` |
| 8. RULE | Is this a new constraint? | `rules/<next-free-number>-<slug>.md` + a row in `rules/00-master-rules.md` |
| 9. CONTEXTIFY | Did structure change? | `context/*.md` |
| 10. MEMOIZE | What must the next session remember? | `memory/*.md`, indexed from `MEMORY.md` |
| 11. INDEX+SYNC | Reachable? Routers agree? | Surgical rows in `skills/00-index.md`, `rules/00-master-rules.md`, `rules/README.md`, `wiki/Documentation-Index.md` |
| 12. VERIFY | Do gates and `knowledge:coverage` pass? | The response — real command + real exit code |
| every. WIKI | Where does this land for a human reader? | `wiki/*.md` + a row in `wiki/Documentation-Index.md` |

Decision records that don't fit a rule or doc: `docs/13-adr/adr-<nnn>-<slug>.md`.

Related: `rules/55-akinator-station-discipline.md` (the non-negotiable subset),
`skills/apply-akinator-without-the-plugin.md` (the full runbook),
`rules/33-knowledge-compounding-and-context-velocity.md` (why this exists),
`rules/34-gate-economy-and-machine-resources.md` (station 12's gate rule).
