# ClawAI Desktop Agent — Audit-to-Prompt Bridge

## What this pack is for
This pack converts the uploaded audit into implementation prompts for Claude so it can execute the desktop-agent redesign without missing key concerns.

## The most important themes carried from the audit
- current auth is high-friction and insecure in UX terms
- device trust must become durable and revocable
- the desktop agent should evolve from a simple polled shell bridge into a true OS-level automation layer
- safety, audit, policies, and scopes are not optional
- the webapp must visibly support device onboarding, device management, and agent value
- chat integration is where long-term product stickiness will come from
- enterprise/admin support is a major moat opportunity

## Suggested implementation order
1. auth replatform
2. CLI redesign
3. webapp onboarding and device management
4. service schema and runtime refactor
5. streaming terminal runtime
6. safety/policies/audit
7. chat integrations
8. power features
9. enterprise/admin
10. hardening and launch

## Deliverables you should ask Claude for
- architecture docs
- Jira-ready backlog
- DB/API contracts
- DTOs
- frontend wireframe logic
- TDD and test plans
- rollout plans
- security review notes
- acceptance criteria per phase
