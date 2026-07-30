# Ollama Research and Usage Accounting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make research explicit and quota-safe, preserve Ollama cloud variants and usage metadata, and expose separate token and web-request consumption in the web app and VS Code extension.

**Architecture:** ClawAI's research service is the sole web-evidence path. Chat orchestration never exposes Ollama native web tools; research request counts are returned in the existing transcript, while connector-owned model metadata describes qualitative compute and nullable published rates.

**Tech Stack:** NestJS 11, Prisma 7, Jest, Next.js 16, React 19, TypeScript, VS Code webviews, Vitest, Playwright.

## Global Constraints

- Research defaults to `NONE`.
- Ollama provider quota percentage is unavailable and must never be estimated.
- Request counts are separate from tokens.
- Unknown models remain usable with `UNKNOWN` usage tier and null prices.
- Every behavior change starts with a failing regression test.
- The VS Code extension release version is 0.12.0.

---

### Task 1: Remove implicit Ollama web tools

**Files:**

- Modify: `apps/claw-chat-service/src/modules/chat-messages/managers/chat-execution.manager.ts`
- Test: `apps/claw-chat-service/src/modules/chat-messages/__tests__/chat-execution.manager.spec.ts`

**Interfaces:**

- Consumes: existing research enrichment performed before provider execution.
- Produces: Ollama request bodies without `tools` for ordinary or researched chat.

- [ ] Add a regression test that captures the Ollama `/chat` body and expects `tools` to be absent.
- [ ] Run the focused Jest test and confirm it fails because tools are currently present.
- [ ] Remove unconditional tool-loop selection and tool definitions from provider request construction.
- [ ] Run the focused test and the chat-service suite.
- [ ] Commit and push the coherent backend safety change.

### Task 2: Preserve Ollama variants and metadata

**Files:**

- Create: `apps/claw-connector-service/src/modules/connectors/constants/ollama-cloud-models.constants.ts`
- Create: `apps/claw-connector-service/prisma/migrations/*_add_model_usage_metadata/migration.sql`
- Modify: `apps/claw-connector-service/prisma/schema.prisma`
- Modify: `apps/claw-connector-service/src/modules/connectors/types/connectors.types.ts`
- Modify: `apps/claw-connector-service/src/modules/connectors/managers/adapters/ollama.adapter.ts`
- Modify: `apps/claw-connector-service/src/modules/connectors/repositories/connector-models.repository.ts`
- Test: `apps/claw-connector-service/src/modules/connectors/__tests__/ollama.adapter.spec.ts`
- Test: `apps/claw-connector-service/src/modules/connectors/repositories/__tests__/connector-models.repository.spec.ts`

**Interfaces:**

- Produces: `usageTier`, nullable published token prices, exact tag variants, and context limits on connector models.

- [ ] Add failing adapter tests for `gpt-oss:20b-cloud` and `gpt-oss:120b-cloud`, curated usage tiers, nullable prices, and an unknown model.
- [ ] Add failing repository tests proving metadata is persisted during create and update.
- [ ] Add the additive enum/columns migration and normalized-model fields.
- [ ] Implement the official-page-derived registry and exact-key/family lookup.
- [ ] Keep authenticated tags authoritative and catalog slugs non-fabricating.
- [ ] Run connector Prisma generation and focused tests, then all connector gates.
- [ ] Commit and push the connector change.

### Task 3: Count research provider operations

**Files:**

- Modify: `apps/claw-research-service/src/modules/search/types/*`
- Modify: `apps/claw-research-service/src/modules/search/services/search-execution.service.ts`
- Modify: `apps/claw-chat-service/src/modules/chat-messages/types/research-transcript.types.ts`
- Modify: `apps/claw-chat-service/src/modules/chat-messages/services/chat-messages.service.ts`
- Test: corresponding research-service and chat-service Jest specs.

**Interfaces:**

- Produces: `searchRequestCount` and `fetchRequestCount` on persisted research transcripts.

- [ ] Add failing research-service tests that count each actual provider attempt, including fallback.
- [ ] Add failing chat-service tests that preserve both counters in assistant metadata.
- [ ] Extend the bounded research result and transcript contracts with non-negative integer counters.
- [ ] Increment counters at the actual provider-call boundaries, not from result count.
- [ ] Run focused tests and both service gate lanes.
- [ ] Commit and push the accounting change.

### Task 4: Render shared usage in the web app

**Files:**

- Modify: existing research transcript schema/controller/view files under `apps/claw-frontend/src/features/chat/`.
- Modify: all 13 frontend locale bundles for added copy.
- Test: corresponding Vitest component/controller tests.

**Interfaces:**

- Consumes: transcript token and request-count fields.
- Produces: distinctly labeled token, search, and fetch consumption.

- [ ] Add failing UI tests for separate search/fetch counters and the unavailable Ollama quota explanation.
- [ ] Extend runtime validation and controller presentation.
- [ ] Render counters without converting requests into tokens.
- [ ] Add all locale keys and run i18n audit.
- [ ] Run frontend typecheck, lint, tests, and build.
- [ ] Commit and push the frontend change.

### Task 5: Add extension research control and telemetry

**Files:**

- Modify: `apps/claw-coding-agent/src/webview/chat-markup.ts`
- Modify: `apps/claw-coding-agent/media/chat.js`
- Modify: `apps/claw-coding-agent/src/webview/chat-inbound-message.ts`
- Modify: `apps/claw-coding-agent/src/webview/chat-view-provider.ts`
- Modify: `apps/claw-coding-agent/src/services/chat-service.ts`
- Modify: `apps/claw-coding-agent/src/backend/contracts.ts`
- Modify: extension localization bundles.
- Test: relevant unit, integration, and Playwright tests.

**Interfaces:**

- Produces: `researchMode: NONE | SEARCH | SEARCH_FETCH | SEARCH_EXTRACT` on chat, agent, compare, and judge requests.
- Consumes: research transcript counters from backend messages/events.

- [ ] Add failing contract tests proving research defaults to `NONE` and the selected value crosses the webview boundary.
- [ ] Add failing chat-service tests proving `researchMode` is sent to the backend.
- [ ] Add failing Playwright tests for the More settings control and visible used-request badge.
- [ ] Add the localized research selector and bounded inbound schema.
- [ ] Thread the selected mode through every execution path and retry snapshot.
- [ ] Parse and display separate search/fetch counters.
- [ ] Run focused tests, then all extension release gates.

### Task 6: Release and verify

**Files:**

- Modify: extension `package.json`, lockfile, changelog, localization artifacts.
- Create: `apps/claw-coding-agent/builds/clawai-coding-agent-0.12.0.vsix`
- Regenerate: root generated knowledge and inventory artifacts.

- [ ] Set extension version 0.12.0 and add a changelog entry.
- [ ] Format first, then regenerate knowledge and audit artifacts.
- [ ] Run every touched workspace gate and `npm run release:preflight`.
- [ ] Package and inspect the exact VSIX contents.
- [ ] Install the exact VSIX and verify `clawai.clawai-coding-agent@0.12.0`.
- [ ] Commit and push the extension release, then update and push the parent submodule pointer.
- [ ] Monitor all GitHub quality, VSIX, release, knowledge, inventory, and Lighthouse jobs to terminal success.
