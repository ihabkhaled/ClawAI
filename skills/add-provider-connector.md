---
name: add-provider-connector
summary: Add a new AI provider adapter to connector-service with encryption, health, and model sync.
task_keywords:
  [
    ai provider,
    connector,
    provider adapter,
    openai anthropic gemini bedrock deepseek ollama grok,
    encrypted config,
    aes-256-gcm,
    model sync,
    connector health,
    connector-service adapter,
  ]
applies_to: [backend, apps/claw-connector-service/src/modules/connectors]
required_rules: [08-security-rules, 02-backend-rules]
required_context: [ai-context-pack, encryption-reference]
affected_workspaces: [apps/claw-connector-service, packages/shared-types]
required_tests: [adapter spec (mocked SDK), health + sync spec, qa connector matrix]
required_docs:
  [docs/07-integrations/ai-provider-catalog.md, docs/04-backend/service-guide-connector.md]
validation_lane: cd apps/claw-connector-service && npm run typecheck && npm run lint && npm test && npm run build
---

# Skill: Add an AI Provider Connector

connector-service owns the 7 providers (OPENAI, ANTHROPIC, GEMINI, AWS_BEDROCK, DEEPSEEK, OLLAMA, GROK). Each provider is an adapter under `apps/claw-connector-service/src/modules/connectors/managers/adapters/`. API keys are AES-256-GCM encrypted (`encryptedConfig`) and never returned in responses.

## When to use

- Onboarding a new upstream AI provider with its own auth, model list, and health semantics.

## When NOT to use

- The provider is already one of the 7 — add models/capabilities to its existing adapter instead.
- It is a workspace/productivity integration (GitHub, Jira, Slack) → use [`./add-workspace-connector.md`](./add-workspace-connector.md).

## Read first

- [`./resolve-task-context.md`](./resolve-task-context.md).
- [`../rules/08-security-rules.md`](../rules/08-security-rules.md) — Secrets Management, Sensitive Data Exposure.
- [`../docs/04-backend/service-guide-connector.md`](../docs/04-backend/service-guide-connector.md), [`../docs/03-architecture/encryption-reference.md`](../docs/03-architecture/encryption-reference.md).

## Repository discovery steps

1. Read an existing adapter under `managers/adapters/` (e.g. the OpenAI or Anthropic adapter) for the interface (`chat`, `listModels`, `healthCheck`) and capability flags.
2. Read how `encryptedConfig` is encrypted/decrypted and where the provider enum lives.
3. Check `ConnectorModel` capability flags (streaming/tools/vision/audio) and the model-sync run flow.

## Tests-first plan

- Adapter spec with the vendor SDK mocked: chat call, `listModels`, and `healthCheck` including an auth-failure branch.
- Sync spec: `ModelSyncRun` populates `ConnectorModel` rows; health spec emits `connector.health_checked`.
- QA connector matrix: create/test/sync endpoints, and assert responses NEVER contain `encryptedConfig`.

## Implementation steps

1. Add the provider to the provider enum (and `packages/shared-types` if cross-service).
2. Wrap the vendor SDK in an adapter under `managers/adapters/` per [`./add-library-adapter.md`](./add-library-adapter.md) — never import the SDK in services/controllers.
3. Implement `chat`/generate, `listModels`, and `healthCheck`; map capability flags onto `ConnectorModel`.
4. Store credentials only as AES-256-GCM `encryptedConfig`; decrypt inside the adapter at call time.
5. Emit `connector.synced` and `connector.health_checked` from the service layer (audit + routing consume them) — see [`./add-rabbitmq-event.md`](./add-rabbitmq-event.md).
6. Ensure the repository strips `encryptedConfig` from every response shape.

## Security considerations

- API keys AES-256-GCM encrypted at rest; never returned in any API response (strip in repository).
- Never log the key, token, or full provider request/response bodies.
- Validate the provider `baseUrl` before outbound calls (SSRF, OWASP A10).

## Failure modes

- `encryptedConfig` leaking into a response → critical data exposure blocker.
- Importing the vendor SDK directly in a service → violates the wrapping rule.
- Health/sync events not emitted → routing can't learn the provider's model health.

## Validation commands

```bash
cd apps/claw-connector-service && npm run typecheck && npm run lint && npm test && npm run build
```

## Documentation updates

- Update `docs/07-integrations/ai-provider-catalog.md`, `docs/04-backend/service-guide-connector.md`, and the connector list in root `CLAUDE.md`.

## Definition of done

- Adapter with chat/list/health, keys encrypted and never exposed, sync + health events emitted, tests + QA matrix green, docs updated.
