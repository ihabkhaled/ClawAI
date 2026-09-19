# Workspaces and Shared Packages

## Workspaces (25)

| Name | Type | Directory | Internal dependencies |
| --- | --- | --- | --- |
| `claw-agent-service` | nestjs-service | [apps/claw-agent-service](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/package.json) | @claw/shared-auth, @claw/shared-constants, @claw/shared-rabbitmq, @claw/shared-types, @claw/shared-utilities |
| `claw-audit-service` | nestjs-service | [apps/claw-audit-service](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-audit-service/package.json) | @claw/shared-constants, @claw/shared-entitlements, @claw/shared-rabbitmq, @claw/shared-types, @claw/shared-utilities |
| `claw-auth-service` | nestjs-service | [apps/claw-auth-service](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/package.json) | @claw/shared-constants, @claw/shared-rabbitmq, @claw/shared-types, @claw/shared-utilities |
| `claw-chat-service` | nestjs-service | [apps/claw-chat-service](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-chat-service/package.json) | @claw/shared-constants, @claw/shared-entitlements, @claw/shared-rabbitmq, @claw/shared-types, @claw/shared-utilities |
| `claw-client-logs-service` | nestjs-service | [apps/claw-client-logs-service](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-client-logs-service/package.json) | @claw/shared-constants, @claw/shared-rabbitmq, @claw/shared-types, @claw/shared-utilities |
| `claw-connector-service` | nestjs-service | [apps/claw-connector-service](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-connector-service/package.json) | @claw/shared-constants, @claw/shared-entitlements, @claw/shared-rabbitmq, @claw/shared-types, @claw/shared-utilities |
| `claw-file-generation-service` | nestjs-service | [apps/claw-file-generation-service](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-generation-service/package.json) | @claw/shared-constants, @claw/shared-rabbitmq, @claw/shared-types, @claw/shared-utilities |
| `claw-file-service` | nestjs-service | [apps/claw-file-service](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-file-service/package.json) | @claw/shared-constants, @claw/shared-entitlements, @claw/shared-rabbitmq, @claw/shared-types, @claw/shared-utilities |
| `claw-frontend` | frontend | [apps/claw-frontend](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-frontend/package.json) | @claw/shared-constants, @claw/shared-types, @claw/shared-utilities |
| `claw-health-service` | nestjs-service | [apps/claw-health-service](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-health-service/package.json) | @claw/shared-utilities |
| `claw-image-service` | nestjs-service | [apps/claw-image-service](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-image-service/package.json) | @claw/shared-constants, @claw/shared-entitlements, @claw/shared-rabbitmq, @claw/shared-types, @claw/shared-utilities |
| `claw-llamacpp-service` | nestjs-service | [apps/claw-llamacpp-service](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-llamacpp-service/package.json) | @claw/shared-constants, @claw/shared-entitlements, @claw/shared-rabbitmq, @claw/shared-types, @claw/shared-utilities |
| `claw-memory-service` | nestjs-service | [apps/claw-memory-service](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-memory-service/package.json) | @claw/shared-constants, @claw/shared-entitlements, @claw/shared-rabbitmq, @claw/shared-types, @claw/shared-utilities |
| `claw-ollama-service` | nestjs-service | [apps/claw-ollama-service](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-ollama-service/package.json) | @claw/shared-constants, @claw/shared-entitlements, @claw/shared-rabbitmq, @claw/shared-types, @claw/shared-utilities |
| `claw-payment-service` | nestjs-service | [apps/claw-payment-service](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/package.json) | @claw/shared-auth, @claw/shared-constants, @claw/shared-entitlements, @claw/shared-rabbitmq, @claw/shared-types, @claw/shared-utilities |
| `claw-research-service` | nestjs-service | [apps/claw-research-service](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-research-service/package.json) | @claw/shared-auth, @claw/shared-constants, @claw/shared-entitlements, @claw/shared-rabbitmq, @claw/shared-types, @claw/shared-utilities |
| `claw-routing-service` | nestjs-service | [apps/claw-routing-service](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-routing-service/package.json) | @claw/shared-constants, @claw/shared-entitlements, @claw/shared-rabbitmq, @claw/shared-types, @claw/shared-utilities |
| `claw-server-logs-service` | nestjs-service | [apps/claw-server-logs-service](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-server-logs-service/package.json) | @claw/shared-constants, @claw/shared-entitlements, @claw/shared-rabbitmq, @claw/shared-types, @claw/shared-utilities |
| `claw-workspace-service` | nestjs-service | [apps/claw-workspace-service](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-workspace-service/package.json) | @claw/shared-auth, @claw/shared-constants, @claw/shared-entitlements, @claw/shared-rabbitmq, @claw/shared-types, @claw/shared-utilities |
| `@claw/shared-auth` | shared-package | [packages/shared-auth](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-auth/package.json) | @claw/shared-types, @claw/shared-utilities |
| `@claw/shared-constants` | shared-package | [packages/shared-constants](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-constants/package.json) | — |
| `@claw/shared-entitlements` | shared-package | [packages/shared-entitlements](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-entitlements/package.json) | @claw/shared-constants, @claw/shared-types |
| `@claw/shared-rabbitmq` | shared-package | [packages/shared-rabbitmq](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-rabbitmq/package.json) | @claw/shared-constants, @claw/shared-types |
| `@claw/shared-types` | shared-package | [packages/shared-types](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/package.json) | — |
| `@claw/shared-utilities` | shared-package | [packages/shared-utilities](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-utilities/package.json) | @claw/shared-constants, @claw/shared-types |

## Shared packages (6)

| Package | Directory | Internal dependencies |
| --- | --- | --- |
| `@claw/shared-auth` | [packages/shared-auth](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-auth/package.json) | @claw/shared-types, @claw/shared-utilities |
| `@claw/shared-constants` | [packages/shared-constants](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-constants/package.json) | — |
| `@claw/shared-entitlements` | [packages/shared-entitlements](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-entitlements/package.json) | @claw/shared-constants, @claw/shared-types |
| `@claw/shared-rabbitmq` | [packages/shared-rabbitmq](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-rabbitmq/package.json) | @claw/shared-constants, @claw/shared-types |
| `@claw/shared-types` | [packages/shared-types](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-types/package.json) | — |
| `@claw/shared-utilities` | [packages/shared-utilities](https://github.com/ihabkhaled/ClawAI/blob/main/packages/shared-utilities/package.json) | @claw/shared-constants, @claw/shared-types |

## Dependency graph

The generated graph currently contains **97 internal workspace dependency edges**. Canonical source: [.ai/manifests/workspace-dependency-graph.json](https://github.com/ihabkhaled/ClawAI/blob/main/.ai/manifests/workspace-dependency-graph.json).
