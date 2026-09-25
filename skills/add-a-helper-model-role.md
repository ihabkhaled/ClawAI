---
name: add-a-helper-model-role
summary: Add a new assistant model role (a helper model that works beside the conversational model) — Prisma enum + migration, seed, admin tab + 13 locales, the chat-service candidates client, metering and provenance.
task_keywords:
  [
    assistant model,
    assistant role,
    helper model,
    AssistantModelRole,
    VISION_HELPER,
    TTS_VOICE,
    text to speech,
    read aloud,
    FILE_WRITER,
    RESEARCH_GATE,
    assistant-models,
    candidates client,
    smart router assistant tab,
    hard-coded model,
    helper vision,
    derived observations,
  ]
applies_to:
  [apps/claw-routing-service, apps/claw-chat-service, apps/claw-frontend, packages/shared-types]
required_rules:
  [
    51-router-candidates-and-model-window-fit,
    37-payg-credit-integrity,
    42-attachment-understanding,
    12-types-enums-constants-and-declaration-ownership,
    20-i18n-and-user-facing-messages,
  ]
required_context: [payg-credit, service-catalog]
affected_workspaces:
  [apps/claw-routing-service, apps/claw-chat-service, apps/claw-frontend, packages/shared-types]
required_tests:
  [
    routing seed + migration presence spec,
    candidates client cache/fallback spec,
    helper manager spec covering success and failure and credit refusal and fall-through and fan-out,
    admin tab section spec,
  ]
required_docs:
  [
    docs/04-backend/service-guide-routing.md,
    docs/04-backend/service-guide-chat.md,
    apps/claw-routing-service/CLAUDE.md,
    apps/claw-chat-service/CLAUDE.md,
    rules/51-router-candidates-and-model-window-fit.md,
  ]
validation_lane: cd apps/claw-<each touched> && npm run typecheck && npm run lint && npm test && npm run build
---

# Skill: Add a Helper Model Role

A model that does a job **beside** the model the user picked (decide whether to
research, write a file's content, describe an image) is an **admin choice**,
never a constant (rule 51 item 7). It lives as an `AssistantModelRole` in
routing-service, is edited on the Smart Router "Assistant models" tab, and is
read by the consuming service through one internal endpoint.

Existing roles: `RESEARCH_GATE`, `FILE_WRITER`, `VISION_HELPER` (ADR-120 batch 5),
`TTS_VOICE` (batch 9, "Read aloud").
Reference implementations: the `VISION_HELPER` role end to end (a helper inside a
chat turn); the `TTS_VOICE` role for a helper with its **own endpoint** and a
**per-unit price** — `SpeechSynthesisManager` (candidate walk + metering),
`TtsVoiceCandidatesClient`, `toSpeechCandidates` (keeps only models it can meter
exactly), migration `20260925230000_add_tts_voice_role`.

## When to use

- A new helper model is about to be hard-coded (`const X_MODEL = 'gpt-…'`).
- An existing hard-coded helper model is being made admin-managed.

## When NOT to use

- The user's own model choice — that is routing, not an assistant role.
- A provider-level default for a whole feature (image generation's model chain
  is `RouterChainEntryRole`, not an assistant role).

## Steps

### 1. routing-service — the role

1. Add the value to `enum AssistantModelRole` in `prisma/schema.prisma`, with a
   `///` comment saying what it does.
2. Migration: `prisma/migrations/<ts>_add_<role>_role/migration.sql` with
   `ALTER TYPE "AssistantModelRole" ADD VALUE IF NOT EXISTS '<ROLE>';`.
   Without it every replica's boot seed fails on an unknown enum label.
3. Seed rows in `src/modules/assistant-models/constants/assistant-model-seed.constants.ts`.
   `seedOnce` fills **each role only while it has no rows**, so a new role
   seeds on existing installs and never overrides an admin's choice. Name only
   aliases the catalog really holds; order first the provider a typical install
   has configured.
4. `npx prisma generate`, then a spec in `__tests__/assistant-model-seed.constants.spec.ts`
   asserting the seeded list and that the migration file exists.

Nothing else in routing changes: `GET/PUT /routing/assistant-models/:role`
(admin) and `GET internal/assistant-models/:role/candidates` validate the role
with `ParseEnumPipe`, so the new value works once the client is regenerated.

### 2. The consumer — a candidates client

Copy `apps/claw-chat-service/src/modules/chat-messages/clients/vision-helper-candidates.client.ts`:
60 s cache, service token, **reuse the last list on an outage, empty list when
never reachable**. Map routing provider names with `ROUTING_TO_CHAT_PROVIDER`
(`OLLAMA_CLOUD → OLLAMA`, `OLLAMA → local-ollama`; others are identity).

Filter candidates by what the job needs (the vision helper keeps only models
the connector catalog marks vision-`SUPPORTED`, so an unconfigured provider is
skipped instead of failing the turn). A LOCAL_ONLY / PRIVACY_FIRST turn keeps
only local providers (`AssembledContext.mediaLocalOnly`).

### 3. Metering (if a candidate can be a paid provider)

Follow [`meter-a-paid-provider-call.md`](./meter-a-paid-provider-call.md):

- A new `PaygSurface` member (shared-types) + ledger label in
  `apps/claw-frontend/src/constants/credit.constants.ts` + 13 locales, and the
  producing file in `tools/__tests__/payg-surface-exhaustiveness.test.mjs` PRODUCERS.
- Reserve per **attempt**; the first attempt's key is stable for the job
  (`${turnId}:vision:${fileId}`), a fall-through gets a distinct one
  (`…:attempt:2`).
- In chat-service, pass the hold into `ChatExecutionManager.callProvider`
  (`paygCall.hold`) so the chokepoint sends `hold.maxOutputTokens`, finalizes
  and releases. Never build a second provider client.
- A 402, a clamped hold or an unreachable meter **ends** the walk (rule 37 item 18).
- Compute a shared result **once per turn** when several lanes need it
  (`AssembledContext.turnId`) — N lanes must not be N paid calls for one input.

### 4. Provenance

The conversational model's `provider`/`model` on the message are never
overwritten. Record helper work separately (`metadata.helperExecutions`:
kind, provider, model, subject id, latency, outcome) and log one content-free
structured line per attempt (`visionHelper {…}`).

### 5. Admin UI + i18n

- `apps/claw-frontend/src/types/smart-router-admin.types.ts`:
  `ASSISTANT_MODEL_ROLE_<ROLE>` constant.
- `components/admin/smart-router/smart-router-assistant-tab.tsx`: one more
  `SmartRouterAssistantRoleSection` (+ a case in its test).
- `<role>Title` / `<role>Description` / `<role>Empty` in
  `lib/i18n/locales/smart-router-admin-translations.ts` (all 13, real
  translations) and in `SmartRouterAdminLocaleTranslation` (`types/i18n.types.ts`).
  The empty text says what happens with no candidate.

## Failure modes

| Symptom                                          | Cause                                                                                                                                                             |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| routing-service crash-loops on boot after deploy | Enum value added to the schema with no `ALTER TYPE` migration.                                                                                                    |
| New role is empty on an existing install         | Seed entry missing, or `seedOnce` batch-counted roles (fixed F0).                                                                                                 |
| Helper "never runs"                              | No candidate passes the capability filter (provider unconfigured).                                                                                                |
| Compare with 3 lanes bills the helper 3 times    | Result not shared per turn, or `turnId` missing on the context.                                                                                                   |
| Ledger shows spend with no surface               | `PaygSurface` member missing; the exhaustiveness tool test fails.                                                                                                 |
| Helper call settles at $0                        | Model billed per unit but the row has no per-unit rate, or the helper cannot report usage — skip such models in the candidate filter (TTS skips gpt-4o-mini-tts). |

## Validation

```bash
cd apps/claw-routing-service && npm run typecheck && npm run lint && npm test && npm run build
cd apps/claw-chat-service   && npm run typecheck && npm run lint && npm test && npm run build
cd apps/claw-frontend       && npm run typecheck && npm run lint && npm test && npm run build
node --test tools/__tests__/payg-surface-exhaustiveness.test.mjs
```
