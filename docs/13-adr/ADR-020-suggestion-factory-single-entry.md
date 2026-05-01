# ADR-020 — Suggestion Factory: Single Entry-Point Pipeline

**Status:** Accepted (2026-05-01)
**Stream:** 13

## Context

Stream 11 (webhooks) and Stream 12 (scheduler) both produce raw signals — provider events and cron candidates respectively. Without a converging point, both would each call directly into the approval engine (Stream 10) and re-implement provider-specific filtering, prompt assembly, and dedup.

## Decision

`SuggestionFactoryManager.process(event)` is the **single** entry-point for converting a raw event into a queued suggestion. Both consumers (`WebhookEventConsumer`, the scheduler's orchestrator) call it.

Inside the factory:

1. Find active `SuggestionTriggerRule` rows where `eventType` and `provider` regexes match the event.
2. Run `contentRegex` against the event body. If no match → drop.
3. For each matched rule, build a draft payload via the rule's `actionKindToSuggest` and call `AiActionApprovalManager.enqueueSuggestion()` (Stream 10).

`SuggestionTriggerRule` is the customer-facing knob: admins create/disable rules via `/workspace/suggestion-rules`. 5 system defaults seeded on boot:
- `github-pr-large-opened`
- `jira-ticket-created`
- `slack-direct-message`
- `github-pr-stale-7d`
- `gitlab-mr-opened`

All regex inputs go through `safeRegex.utility.ts` (length cap + nested-quantifier rejection) to defeat ReDoS.

## Consequences

- Adding a new automation = one trigger-rule row, no code change.
- Factory is the only place that knows about both event sources, so dedup logic lives in one place.
- Disabling a rule via UI takes effect within 5 seconds (rule cache TTL) — no redeploy.
- Bad regex input is rejected at create-time (HTTP 400 with `TRIGGER_REGEX_UNSAFE`).

## Verification

- `qa/test-stream-13-suggestion-factory.sh` exercises CRUD + bad-regex rejection.
- Live verified: `POST /workspace/suggestion-rules` with malicious `(a+)+$` → HTTP 400.
