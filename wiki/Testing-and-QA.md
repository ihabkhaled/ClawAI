# Testing and QA

Current generated test-file count: **1273** across **25 workspaces**.

| Workspace | Runner | Test files |
| --- | --- | --- |
| @claw/shared-auth | vitest | 1 |
| @claw/shared-constants | vitest | 3 |
| @claw/shared-entitlements | vitest | 8 |
| @claw/shared-rabbitmq | vitest | 0 |
| @claw/shared-types | vitest | 3 |
| @claw/shared-utilities | vitest | 37 |
| claw-agent-service | vitest | 13 |
| claw-audit-service | vitest | 21 |
| claw-auth-service | vitest | 96 |
| claw-chat-service | vitest | 151 |
| claw-client-logs-service | vitest | 6 |
| claw-connector-service | vitest | 25 |
| claw-file-generation-service | vitest | 7 |
| claw-file-service | vitest | 20 |
| claw-frontend | vitest | 474 |
| claw-health-service | vitest | 4 |
| claw-image-service | vitest | 12 |
| claw-llamacpp-service | vitest | 17 |
| claw-memory-service | vitest | 14 |
| claw-ollama-service | vitest | 18 |
| claw-payment-service | vitest | 110 |
| claw-research-service | vitest | 31 |
| claw-routing-service | vitest | 99 |
| claw-server-logs-service | vitest | 7 |
| claw-workspace-service | vitest | 96 |

## Test architecture
- Vitest is the workspace unit/integration runner.
- Playwright covers browser/E2E flows.
- Coverage is risk-based, with high global floors and stricter branch expectations for critical pure logic.
- Persistence, logs, RBAC, plan tiers, regressions, security and real browser behavior are part of completion evidence.
- Flaky tests, fixtures, contract tests, RabbitMQ, database, accessibility, visual and security testing each have dedicated standards.

Canonical sources: [testing/README.md](https://github.com/ihabkhaled/ClawAI/blob/main/testing/README.md) · [testing/testing-strategy.md](https://github.com/ihabkhaled/ClawAI/blob/main/testing/testing-strategy.md) · [testing/coverage-policy.md](https://github.com/ihabkhaled/ClawAI/blob/main/testing/coverage-policy.md) · [rules/49-qa-team-discipline-and-test-evidence.md](https://github.com/ihabkhaled/ClawAI/blob/main/rules/49-qa-team-discipline-and-test-evidence.md).
