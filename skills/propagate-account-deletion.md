---
name: propagate-account-deletion
summary: Implement durable account deletion across service-owned databases.
task_keywords: account deletion, user deleted, erasure, anonymization, outbox, tombstone, RabbitMQ
applies_to: auth, RabbitMQ consumers, data retention
required_rules: 00-non-negotiable-rules, 61-threads-account-deletion
required_context: architecture-map, service-dependency-map
affected_workspaces: claw-auth-service, claw-threads-service, claw-thread-generation-service, shared-types
required_tests: outbox transaction, retry, duplicate delivery, anonymization, deletion guard
required_docs: product spec, architecture, QA evidence
validation_lane: focused changed specs, changed-file lint, affected typecheck
---

## When to use

Use for account deletion that crosses independently owned service databases.

## When NOT to use

Do not use for ordinary profile edits or retention changes without an approved policy.

## Read first

Run `npm run knowledge:context -- --task="cross-service account deletion"`; read rules 00 and 61, architecture and dependency maps, then the owning services' guides.

## Repository discovery steps

Trace the Auth deletion entrypoint, database transaction, RabbitMQ event conventions, consumer registration, service-owned data, and existing account-deletion contracts.

## Tests-first plan

Add focused tests for atomic outbox creation, retry without sensitive errors, idempotent consumers, retention policy, and rejection of future work. Run them red before implementation.

## Implementation steps

Write the outbox in the account deletion transaction. Publish typed events with bounded retry. Each service applies its policy in its own transaction and persists a hashed tombstone before acknowledging.

## Security considerations

Never expose raw identifiers in logs or public responses. Preserve only data explicitly allowed by the approved retention decision. Keep service database boundaries intact.

## Failure modes

Recover stale claims, retry failed publishing, tolerate duplicate events, and ensure tombstones prevent delayed jobs from recreating deleted data.

## Validation commands

Run changed specs, changed-file ESLint, and touched workspace typecheck. Validate migrations and generated knowledge artifacts.

## Documentation updates

Update the product policy, architecture/dependency maps, service guide, decision record, and batch QA evidence.

## Definition of done

The event is durable, both consumers are idempotent, policy data is tested, evidence is honest, and the normal commit hooks pass.
