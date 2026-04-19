# Skills Framework KPIs

How we prove the skills system actually improves quality, speed, and confidence.

## Principle

If we can't measure it, the framework is theater. Every skill should eventually trace to a measurable outcome or a measurable process indicator. Measurements fall into four buckets.

## Bucket 1 — Quality outcomes

| KPI                        | Definition                                                  | Target                 | Source                         |
| -------------------------- | ----------------------------------------------------------- | ---------------------- | ------------------------------ |
| Escaped-defect rate        | Bugs found in production / total features shipped per month | ≤5%                    | Incident tracker + release log |
| Mean time to detect (MTTD) | Time between deploy and first user-impacting signal         | <2h for P1, <1d for P2 | Observability + alerts         |
| Mean time to repair (MTTR) | Time between detection and resolution                       | <4h for P1, <2d for P2 | Incident tracker               |
| Security incident count    | Confirmed security incidents per quarter                    | 0                      | Security audit log             |
| Rollback rate              | Rollbacks / total deploys                                   | <3%                    | Deploy log                     |

## Bucket 2 — Process compliance

| KPI                     | Definition                                             | Target | Source         |
| ----------------------- | ------------------------------------------------------ | ------ | -------------- |
| PR-to-skill compliance  | PRs passing all relevant quality gates on first review | ≥90%   | PR review log  |
| Coverage-gate pass rate | PRs hitting coverage threshold before merge            | 100%   | CI             |
| Lint-gate pass rate     | PRs with 0 lint errors before merge                    | 100%   | CI             |
| QA-script presence      | New features shipping with `qa/test-<feature>.sh`      | 100%   | PR checklist   |
| Docs-gate pass rate     | PRs updating docs/ or CLAUDE.md when required          | ≥95%   | PR checklist   |
| Skill-cited PRs         | PRs whose description cites the relevant skills        | ≥70%   | PR text search |

## Bucket 3 — Delivery speed

| KPI                              | Definition                               | Target           | Source            |
| -------------------------------- | ---------------------------------------- | ---------------- | ----------------- |
| Lead time for change             | Commit to deploy (p50, p95)              | p50 <4h, p95 <2d | Deploy log        |
| PR cycle time                    | Open to merge (p50, p95)                 | p50 <1d, p95 <3d | PR log            |
| Feature rework rate              | % of features requiring post-merge fixes | <10%             | Incident + PR log |
| New-engineer time-to-first-merge | Days from start to first merged PR       | <3d              | HR + PR log       |

## Bucket 4 — Framework health

| KPI                                     | Definition                                | Target                                                 | Source                 |
| --------------------------------------- | ----------------------------------------- | ------------------------------------------------------ | ---------------------- |
| Stale skill ratio                       | Skills with `last_reviewed` >90 days old  | <10%                                                   | `npm run skills:stale` |
| Broken-reference count                  | Skill files with dead relative links      | 0                                                      | Validator              |
| Skill version churn                     | Major version bumps per quarter           | 1–3 is healthy; >5 means instability; <1 means neglect | Git log                |
| Deprecated-skill graceful-archival rate | Deprecated skills archived within 30 days | 100%                                                   | Validator              |

## Reporting cadence

- **Weekly** — process compliance (PRs, gates, rework)
- **Monthly** — quality outcomes (defects, incidents, rollbacks)
- **Quarterly** — delivery speed + framework health + overall skills review
- **Per-release** — release-specific gates cross-checked against `quality-gates/release-readiness-gate.md`

## Instrumentation plan

- PR template includes a "Skills cited" section — text-searchable
- CI emits a structured JSON report of which gates passed/failed per PR
- Incident retro template includes a "Skill gap?" question
- `scripts/skills-kpi.mjs` rolls the numbers up into a quarterly dashboard

## How we know it's working

- Quality outcomes trend down (defects, incidents, rollbacks)
- Process compliance trends up toward 100%
- Delivery speed stays flat or improves (the framework isn't slowing us down)
- Framework health stays green (no stale skills, no broken refs)

## How we know it's failing

- Outcomes don't improve — skills are theater; we're not following them
- Process compliance stuck below 90% — the gates aren't enforced
- Delivery speed degrades >20% — the framework is over-engineered; simplify
- Stale ratio climbs above 25% — the framework has no owner; reassign ownership

## Anti-metrics (what not to optimize)

- **Number of skills** — more isn't better; each skill has maintenance cost
- **Skill file length** — long skills are skimmed; aim for <300 lines
- **Coverage percentage as a lone metric** — high coverage of meaningless tests is worse than medium coverage of strong tests
- **Time spent writing docs** — docs are a means, not an end

## First-quarter success criteria

After Q1 of the framework being live:

- [ ] 100% of new PRs pass the validator
- [ ] At least one retro cites a skill (either as prevention or as a gap)
- [ ] Coverage-gate pass rate ≥95%
- [ ] Zero critical skill violations merged
- [ ] All `foundations/` skills have at least one worked example
- [ ] `INDEX.md` is up-to-date with no dead links
