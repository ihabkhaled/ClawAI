---
id: provider-analysis
title: Provider analysis
category: workspace-integrations
level: mandatory
applies_to:
  - workspace-adapter
status: active
version: 1.0.0
last_reviewed: 2026-04-19
owners:
  - integrations-team
---

# Provider analysis

## Purpose

Before implementing a new workspace provider, analyze: auth model, scopes, rate limits, failure modes, webhook support. Missing any one = broken integration.

## Analysis checklist

1. **Auth model** — OAuth 2.0 / PAT / API key / service account?
2. **Scopes** — least-privilege scope list; document each
3. **Rate limits** — per-minute, per-hour, burst policy
4. **Pagination** — cursor / page / offset; max page size
5. **Sync model** — full / incremental (delta token? cursor?)
6. **Webhooks** — available? reliable? authentication?
7. **Error semantics** — how does the provider signal 429, 5xx, invalid token?
8. **Data retention** — what can we cache, for how long?
9. **Compliance** — GDPR, HIPAA considerations
10. **SDK vs raw HTTP** — evaluate maintainability

## Strict rules

- **MUST** document all 10 items before writing adapter code.
- **MUST** specify least-privilege scopes.

## Anti-patterns

- Requesting all scopes because "we might need them later".
- No rate-limit handling → ban.
- Polling when a webhook exists.

## Validation checklist

- [ ] All 10 items in analysis doc
- [ ] Scopes least-privilege
- [ ] Rate limits documented

## Quality gate

| Check                | Blocker? | Evidence                                       |
| -------------------- | -------- | ---------------------------------------------- |
| Analysis doc present | yes      | `.claude/Integrations/<provider>__ANALYSIS.md` |

## Definition of done

1. Analysis document written.
2. Owner sign-off.
