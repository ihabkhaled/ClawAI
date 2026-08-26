# ClawAI — Documentation Rules

> Every feature produces documentation. No doc = incomplete feature. This is not aspirational — it is a delivery blocker.

---

## When Docs Are Required

| What changed            | What to create/update                                                  |
| ----------------------- | ---------------------------------------------------------------------- |
| New NestJS service      | `docs/04-backend/service-guide-<name>.md` (full architecture doc)      |
| New frontend page       | Update `docs/05-frontend/` relevant section                            |
| New API endpoint        | `docs/12-reference/api-reference.md`                                   |
| New RabbitMQ event      | `docs/03-architecture/event-bus.md`                                    |
| New routing behavior    | `docs/03-architecture/routing-engine.md` and the related business spec |
| New env variable        | `docs/06-data/environment-variables.md`                                |
| New Docker change       | `docs/08-runtime-devops/docker-guide.md`                               |
| New Nginx route         | `docs/08-runtime-devops/docker-guide.md` or nginx-specific doc         |
| Any architecture change | Relevant file in `docs/03-architecture/`                               |
| Any new rule/pattern    | Root `CLAUDE.md` + `CODEX.md` + `cursor.md` + rules folder             |
| New service port        | `packages/shared-constants` + CLAUDE.md port table                     |

---

## New Service Documentation Format

`docs/04-backend/service-guide-<name>.md`:

```markdown
# <Service Name> — Architecture Guide

## Purpose

What problem this service solves and why it exists.

## Tech Stack

- Runtime: NestJS 10 + TypeScript
- Database: PostgreSQL (Prisma) / MongoDB (Mongoose)
- Port: XXXX
- DB: claw\_<name>

## Architecture

Layer diagram and responsibilities.

## Data Models

All Prisma/Mongoose models with field descriptions.

## API Endpoints

All public endpoints with request/response shapes.

## Events Published

| Pattern | Trigger | Payload shape |
| ------- | ------- | ------------- |

## Events Consumed

| Pattern | Source | Handler |
| ------- | ------ | ------- |

## Background Jobs

Any scheduled tasks or fire-and-forget managers.

## Error Handling

How errors propagate and what happens on failure.

## Environment Variables

All vars this service reads.

## Startup Sequence

What happens when the service boots.
```

---

## CLAUDE.md Update Rules

Update root `CLAUDE.md` when:

- New service added → workspace layout table, port table, nginx map
- New env var added → environment variables section
- New event added → event bus table
- New routing behavior → routing modes table
- New architectural pattern introduced → relevant section
- New ESLint rule enforced → ESLint rules section
- New engineering mindset added → mindset section
- New hard rule that all AI agents must follow → golden rules section

Update service-specific `CLAUDE.md` when:

- New repository method added → owned tables section
- New manager class added → architecture section
- New external API integration → dependencies section
- New command available → commands section

---

## Documentation Quality Standards

Each doc must answer:

1. **What** — What is this thing?
2. **Why** — Why does it exist?
3. **How** — How does it work?
4. **Where** — Where does the code live?
5. **When** — When is it triggered / called?

Docs must NOT:

- Be auto-generated boilerplate without real content
- Say "TODO: document this later"
- Have broken links to code that was renamed
- Have tables with placeholder "N/A" values that were never filled in

---

## Docs Checklist (per feature)

- [ ] Root `CLAUDE.md` updated (new services, env vars, events, routes, patterns)
- [ ] Service-specific `CLAUDE.md` updated for each service touched
- [ ] `docs/12-reference/api-reference.md` updated (new/changed endpoints)
- [ ] `docs/03-architecture/event-bus.md` updated (new events)
- [ ] `docs/06-data/environment-variables.md` updated (new vars)
- [ ] `docs/08-runtime-devops/docker-guide.md` updated (new containers, ports)
- [ ] `CODEX.md` updated (if new rules or patterns)
- [ ] `cursor.md` updated (if new rules or patterns)
- [ ] `rules/` folder updated if new rules codified
- [ ] `skills/` folder updated if new skills discovered

## Enforcement

- **Knowledge check** — `npm run knowledge:verify` fails on a broken internal
  link in any governance document; `npm run knowledge:coverage` fails when a
  rule or skill is unreachable from its index or a service lacks its guide.
- **CI job** — the knowledge lane in `.github/workflows/ai-native-os.yml`.
- **Review checklist** — a doc that records _what_ without _why_ fails review.

## Definition of done

- [ ] Every internal link resolves.
- [ ] The doc says why, not only what, and states what would make it stale.
- [ ] It is reachable from the index that owns it.
