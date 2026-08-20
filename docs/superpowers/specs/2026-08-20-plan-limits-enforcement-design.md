# Plan Limits Enforcement Design

## Goal

Make subscription limits and orchestration-lab access visible and enforceable at every boundary. The Free account must expose and obey its configured token, chat-thread, message, workspace, context-pack, memory, and lab entitlements. Backend error codes remain authoritative; the frontend translates them in all 13 locales.

## Existing State Audit

- **Partial — entitlement contract:** auth returns all resource limits, but the frontend entitlement type and My Plan component expose only token limits and chats per day.
- **Partial — subscription surfaces:** billing cards show daily/monthly tokens and chats; public cards show only daily/monthly tokens. Checkout reuses the incomplete card.
- **Done, verify — resource enforcement:** chat threads, messages, workspace connections, context packs, and memory items already use atomic owner-service repository guards.
- **Done, verify — lab enforcement:** Compare and all nine orchestration labs already require the matching plan feature and role permission at chat-service API boundaries.
- **Missing — localized quota errors:** frontend API error mapping does not recognize daily thread/message limit codes and can display backend English text.
- **Partial — E2E:** plan and orchestration browser tests exist, but do not prove the requested Free-account catalog, all visible limits, localized quota errors, or direct-API denials comprehensively.

## Architecture

Extend existing seams; do not add a parallel quota system.

1. Auth remains the source of effective plan entitlements.
2. Each resource-owning service retains its atomic create-with-limit operation.
3. Chat-service remains the enforcement boundary for plan feature plus RBAC permission checks.
4. Frontend plan surfaces consume the existing catalog/entitlement DTOs and render a shared complete limit list and feature list.
5. Machine-readable backend codes map to locale keys; raw backend English is never the primary user message for known quota failures.

`null` means unlimited and `0` means disabled throughout.

## Data and UI Changes

- Add weekly token quota to admin plan create/edit types, validation, form, and exact request serialization if the current API omits it.
- Expand frontend effective entitlement limits with messages per day, workspace connections, context packs, and memory items.
- Render daily, weekly, and monthly tokens plus all five non-token limits on My Plan, subscription selection, and checkout/public pricing surfaces where the full catalog is available.
- Render all general features and the nine orchestration labs from the canonical feature-field registry.
- Preserve the configured Free values exactly, including 300,000 daily tokens, 20,000 weekly tokens, unlimited monthly tokens, and five chat threads per UTC day.

## Error Handling

- Standardize known quota failures as HTTP 429 with stable codes.
- Keep disabled plan features and missing role permissions as HTTP 403 with distinct codes.
- Map known codes to translated frontend strings and show them in the relevant chat/thread panel and toast path.
- Direct API requests must fail before model execution or resource creation.

## Testing

- TDD unit tests for DTO propagation, UI rendering, API error translation, and every changed backend guard.
- Backend integration/E2E coverage for thread, message, resource, Compare, and nine lab rejections.
- Playwright coverage for plan visibility, fifth/sixth thread behavior, message exhaustion, translated UX, and disabled-feature direct API calls.
- Fresh-browser verification with the supplied Free account; credentials remain runtime-only and are never written to source, logs, screenshots, or reports.

## Delivery

Use coherent gated commits, regenerate knowledge and inventory artifacts after formatting, push the branch, open a PR, wait for every required check, and use the repository release workflow after merge readiness. Repository policy overrides any conflicting implementation detail.
