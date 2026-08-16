# Cloud Smart Router — Phase A baseline

Captured before any refactor, per pack `02_CODEBASE_AUDIT_PROMPT.md`.

| Item                                                                                                    | Value                                                                                                                          |
| ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Branch                                                                                                  | `feat/cloud-smart-router`                                                                                                      |
| Base commit                                                                                             | `3942669a`                                                                                                                     |
| Pack reference commit                                                                                   | `0757a1be`                                                                                                                     |
| Drift in `apps/claw-{routing,chat,connector}-service` + `apps/claw-frontend` since the reference commit | **none** — `git diff --stat 0757a1be HEAD -- <those paths>` is empty, so the pack's audit is current for every path it targets |

## Routing service suite

```
$ npm test --workspace=claw-routing-service
Test Suites: 50 passed, 50 total
Tests:       769 passed, 769 total
Snapshots:   0 total
Time:        17.98 s
```

## Prerequisite for a fresh worktree

A new worktree has no `node_modules` and no built shared packages. Jest then fails
15 suites with an unresolved `@claw/shared-utilities` at
`src/common/utilities/jwt.utility.ts:1` — this is environmental, not a regression.
Reproduce the CI order before trusting any local run:

```bash
npm install --no-audit --no-fund
npm run prisma:generate --workspace=claw-routing-service
for p in shared-types shared-constants shared-utilities shared-rabbitmq shared-auth shared-entitlements; do
  npm run build --workspace=@claw/$p
done
npm test --workspace=claw-routing-service
```
