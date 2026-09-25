> **Wiki source:** [`docs/02-business-product/flagship-features.md`](https://github.com/ihabkhaled/ClawAI/blob/main/docs/02-business-product/flagship-features.md) on the current `main` branch. This page mirrors the repository documentation so the Wiki stays grounded in the codebase.

# Flagship Features

> **Canonical home for the flagship list.** The positioning these flagships serve
> — "Every AI, one workspace" — is canonical in
> [product-vision.md](https://github.com/ihabkhaled/ClawAI/blob/main/docs/01-executive-context/product-vision.md); why it changed is
> [ADR-126](https://github.com/ihabkhaled/ClawAI/blob/main/docs/13-adr/adr-126-every-ai-one-workspace-positioning.md). The README,
> the wiki and the marketing site link here rather than keeping their own list.
>
> **Audited against the code on 2026-09-26** (main at `0dd790060`, release
> v1.141.0). Every row names the wired code that runs it. Status:
> **Shipped** — wired end to end, with a caller; **Partial** — shipped with a
> limit the copy must respect; **Gap** — not built, never claimed. Commit subjects
> were used only as leads.
>
> Prices, allowances and plan limits are not restated here; they live in
> [`docs/business/`](https://github.com/ihabkhaled/ClawAI/blob/main/docs/business/README.md) and the plan catalog.

The older, broader list is the [feature catalog](https://github.com/ihabkhaled/ClawAI/blob/main/docs/02-business-product/feature-catalog.md) (last
reviewed 2026-04-11) and the per-feature [feature inventory](https://github.com/ihabkhaled/ClawAI/blob/main/docs/02-business-product/feature-inventory.md).

---

## The four pillars

| Pillar                      | What it means                                                                      | Flagships                    |
| --------------------------- | ---------------------------------------------------------------------------------- | ---------------------------- |
| **One workspace**           | Every model, and everything around a model — it sees, hears, researches and builds | 1–8, 10                      |
| **Pay as you go**           | Credit metered per use, shown in the visitor's currency                            | 9                            |
| **Bring your team**         | Admin-managed users, roles, plan grants, usage, and governed coding agents         | 11, 12 (with the gaps below) |
| **Local-first and private** | Run the whole stack on your own hardware, with local models and retention controls | 13, 14, 15                   |

---

## 1. Multimodal AI — Shipped

| Capability                                                                             | Evidence                                                                                                                           | Limits the copy must respect                       |
| -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Voice and video notes recorded in chat, with a consent step                            | `apps/claw-frontend/src/components/chat/voice-video-recorder.tsx`, `media-recording-consent-dialog.tsx`                            | —                                                  |
| Resumable chunked upload                                                               | `apps/claw-file-service/.../managers/chunked-upload.manager.ts`                                                                    | Files over 4 MB go in chunks; a session lasts 24 h |
| Transcription through a queue, routed to a model that can listen                       | `apps/claw-file-service/.../managers/transcription.manager.ts` (RabbitMQ `FILE_TRANSCRIBE_*`)                                      | OpenAI and Gemini adapters; audio capped at 12 MB  |
| Helper vision: a vision model describes an image for a text-only model                 | `apps/claw-chat-service/.../managers/vision-helper.manager.ts`                                                                     | Paid plans only                                    |
| Per-model modality routing; AUTO ranks by modality fit                                 | `apps/claw-routing-service/.../utilities/modality-fit.utility.ts`, `cloud-router-candidates.utility.ts`                            | —                                                  |
| Videos reach every model (probe, transcribe, key frames)                               | `apps/claw-file-service/.../managers/video-processing.manager.ts`, `apps/claw-chat-service/.../managers/video-delivery.manager.ts` | Video length is plan-gated                         |
| An attachment sent with no text is answered, in chat and every lab                     | `apps/claw-chat-service/.../utilities/attachment-only-turn.utility.ts`                                                             | —                                                  |
| Media features are plan-gated where they execute; transcription and vision are metered | ADR-122; `transcription-meter.manager.ts`                                                                                          | —                                                  |

Decisions: [ADR-120](https://github.com/ihabkhaled/ClawAI/blob/main/docs/13-adr/adr-120-clawai-owns-multimodal-orchestration.md),
[ADR-122](https://github.com/ihabkhaled/ClawAI/blob/main/docs/13-adr/adr-122-media-features-plan-gated-at-the-executing-service.md).

## 2. Files from chat — Shipped

| Capability                                                                                                              | Evidence                                                                  | Limits                                                             |
| ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| The AI writes PDF (typeset by Typst), Word, Excel, PowerPoint and Zip bundles — plus CSV, HTML, Markdown, text and JSON | `apps/claw-file-generation-service/src/modules/file-generation/adapters/` | Spreadsheet cells never run as formulas                            |
| The AI names its files from its own title, in any language                                                              | `utilities/file-identity.utility.ts`                                      | —                                                                  |
| Daily AI-file allowance per plan, refused before the model writes                                                       | `chat-execution.manager.ts` → auth `features/reserve`                     | Numbers in `docs/business/plan-allowances.md`; exports never count |
| Download any answer as MD, TXT, HTML, DOCX, PDF, XLSX, PPTX or ZIP with no model call                                   | `apps/claw-frontend/src/components/chat/answer-export-menu.tsx`           | —                                                                  |

Decisions: [ADR-105](https://github.com/ihabkhaled/ClawAI/blob/main/docs/13-adr/adr-105-answer-export-through-the-file-pipeline.md),
[ADR-107](https://github.com/ihabkhaled/ClawAI/blob/main/docs/13-adr/adr-107-one-markdown-parser-typst-pdf.md),
[ADR-108](https://github.com/ihabkhaled/ClawAI/blob/main/docs/13-adr/adr-108-spreadsheets-decks-and-bundles.md),
[ADR-109](https://github.com/ihabkhaled/ClawAI/blob/main/docs/13-adr/adr-109-ai-names-its-files.md),
[ADR-110](https://github.com/ihabkhaled/ClawAI/blob/main/docs/13-adr/adr-110-daily-ai-file-allowance.md),
[ADR-111](https://github.com/ihabkhaled/ClawAI/blob/main/docs/13-adr/adr-111-file-writer-hardening-from-the-model-matrix.md).

## 3. Smart attachments — Shipped

| Capability                                                                | Evidence                                                                                                 | Limits                                                                   |
| ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Archives expand as a tree: ZIP, 7z, RAR/RAR5, TAR, GZIP, BZIP2, XZ        | `apps/claw-file-service/src/common/utilities/seven-zip.utility.ts` (7-Zip WASM; ZIP via node-stream-zip) | —                                                                        |
| Password-protected archive: retry the password in the chat                | `file-archive.controller.ts` `POST :id/archive-password`; `archive-attachment-card.tsx`                  | 3 attempts                                                               |
| Drop files anywhere on the chat panel; send with no text                  | `apps/claw-frontend/src/components/chat/chat-panel-dropzone.tsx`                                         | —                                                                        |
| Owner-only downloads that expire after an hour                            | `FileGenerationOwnerGuard`, `FILE_ASSET_TTL_MS`                                                          | **AI-generated files only**, not uploads; an expired file can be rebuilt |
| Every upload is virus-scanned (ClamAV) and refused if the scanner is down | `FilesService.runSecurityChecks` → `ClamavClient.scan`                                                   | Operators can disable with `CLAMAV_ENABLED`                              |

Decisions: [ADR-104](https://github.com/ihabkhaled/ClawAI/blob/main/docs/13-adr/adr-104-expiring-owner-only-file-downloads.md),
[ADR-114](https://github.com/ihabkhaled/ClawAI/blob/main/docs/13-adr/adr-114-seven-zip-wasm-for-every-archive-format.md).

## 4. Narrated AI research and crawling — Shipped

| Capability                                                                                                                                                 | Evidence                                                                                           | Limits                                                                      |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| An AI plans each turn's web work and narrates every step; the log survives a refresh                                                                       | `apps/claw-chat-service/.../services/research-gate.service.ts`, `research-orchestrator.manager.ts` | —                                                                           |
| Every URL in a message is opened, not searched                                                                                                             | `detectPromptUrls`                                                                                 | Up to 10 URLs per message                                                   |
| Site crawl                                                                                                                                                 | `apps/claw-research-service/.../site-crawl.manager.ts`                                             | Hard ceiling 200 pages; default 20                                          |
| Fetch escalation: official API → plain HTTP → TLS impersonation → headless browser → Crawl4AI → FlareSolverr → Firecrawl → reader proxy → archive snapshot | `apps/claw-research-service/src/modules/fetch/constants/fetch-strategy.constants.ts`               | The three sidecars are **off by default** (compose profile + admin switch)  |
| robots.txt is respected — a Disallow refuses the fetch                                                                                                     | `RobotsPolicyService` in `fetch.service.ts`                                                        | —                                                                           |
| Every configured search provider is queried and merged                                                                                                     | `search-execution.service.ts`                                                                      | Brave, Exa, Firecrawl, Ollama web, SearXNG, SerpAPI, Tavily — as configured |

Decisions: [ADR-091](https://github.com/ihabkhaled/ClawAI/blob/main/docs/13-adr/adr-091-user-urls-are-opened-not-searched.md),
[ADR-092](https://github.com/ihabkhaled/ClawAI/blob/main/docs/13-adr/adr-092-site-crawl-reuses-fetchservice-no-new-fetch-path.md),
[ADR-098](https://github.com/ihabkhaled/ClawAI/blob/main/docs/13-adr/adr-098-auto-research-is-an-ai-driven-narrated-loop.md),
[ADR-121](https://github.com/ihabkhaled/ClawAI/blob/main/docs/13-adr/adr-121-pluggable-fetch-strategy-layer.md).

## 5. Orchestration labs — Shipped

Ten orchestration modes: **Compare** plus nine labs — Consensus, Escalation,
Repair, Decompose, Best-of-N, Verify, Pipeline, Cost Ensemble, Role Pack.

| Capability                                                                          | Evidence                                                          | Limits                                                                      |
| ----------------------------------------------------------------------------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Compare 2–5 models; a judge ranks every lane in one comparative call                | `compare-judge.manager.ts`, `parallel-execution.manager.ts`       | —                                                                           |
| Consensus, escalation and the other labs                                            | `consensus-execution.manager.ts`, `escalation-chain.manager.ts`   | Which labs a plan unlocks is in the plan catalog                            |
| Every lab takes attached files and research, with the same context a chat turn gets | `ChatContextGatewayManager`; each lab calls the research enricher | Labs **read** files; writing files is a routing-mode feature, not a lab one |

Decisions: [ADR-116](https://github.com/ihabkhaled/ClawAI/blob/main/docs/13-adr/adr-116-comparative-judge-for-compare.md),
[ADR-118](https://github.com/ihabkhaled/ClawAI/blob/main/docs/13-adr/adr-118-orchestration-lanes-share-grounding-not-just-evidence.md).

## 6. Conversation power tools — Shipped

| Capability                                                                       | Evidence                                                                           | Limits                                                                                           |
| -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Branch a conversation from any message                                           | `chat-threads.controller.ts` `POST :id/branch`; `message-branch-action.tsx`        | —                                                                                                |
| Edit a prompt and rerun the thread from it                                       | `chat-messages.controller.ts` `POST :id/edit`                                      | Deletes the messages below, behind a warning                                                     |
| Find in a conversation and jump to the message; search across threads            | `use-in-thread-search.ts`, `use-jump-to-message.ts`, `use-global-thread-search.ts` | —                                                                                                |
| Export a whole conversation                                                      | `use-export-thread.ts`                                                             | **Markdown only**; single answers export in 8 formats (flagship 2)                               |
| Cross-thread context, on by default, own threads only                            | `useCrossThreadContext @default(true)` in the chat schema                          | Off per thread; [ADR-087](https://github.com/ihabkhaled/ClawAI/blob/main/docs/13-adr/adr-087-cross-thread-retrieval.md) predates the default flip |
| Prompt history with up and down                                                  | `use-rich-prompt-textarea.ts` `recallHistory`                                      | —                                                                                                |
| Threads named from their opening sentence; model reasoning kept after the stream | `derive-thread-title.utility.ts`; `message-reasoning-panel.tsx`                    | Title costs no tokens                                                                            |

## 7. Read aloud — Shipped

Metered, plan-gated text-to-speech that starts playing as the first segment is
ready and can be cancelled without charge. `message-speech.service.ts`,
`speech-job.manager.ts`, `speech-segments.utility.ts`. Providers: OpenAI and
Gemini. [ADR-122](https://github.com/ihabkhaled/ClawAI/blob/main/docs/13-adr/adr-122-media-features-plan-gated-at-the-executing-service.md).

## 8. Image generation and shared conversations — Shipped

| Capability                                                                                  | Evidence                                                         | Limits                                                                                                    |
| ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Generate images in chat: OpenAI, Gemini, xAI Grok, local Stable Diffusion WebUI and ComfyUI | `apps/claw-image-service/src/modules/image-generation/adapters/` | Metered and plan-gated; cancelable                                                                        |
| Shared conversation pages publish their images                                              | `chat-shares/adapters/share-asset.adapter.ts`                    | The share owns copies; an optional Cloud Vision scan decides ads and indexing, it never blocks publishing |

Decision: [ADR-075](https://github.com/ihabkhaled/ClawAI/blob/main/docs/13-adr/adr-075-public-share-assets.md).

## 9. Pay-as-you-go credit and local-currency display — Shipped

| Capability                                                                                                                                                                                  | Evidence                                                                                |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Connector credit metered on 12 surfaces: chat, compare, judge, orchestration, image, file generation, coding agent, workspace action, routing, transcription, vision helper, text-to-speech | `packages/shared-types/src/enums/payg-surface.enum.ts`; `credit-reservation.manager.ts` |
| Prices shown in the visitor's currency; the charge settles separately                                                                                                                       | `apps/claw-payment-service/src/modules/display-fx/`; `currency-switcher.tsx`            |
| Monthly, quarterly, semiannual and yearly terms                                                                                                                                             | `packages/shared-types/src/enums/billing-interval.enum.ts`                              |

Numbers: [`docs/business/`](https://github.com/ihabkhaled/ClawAI/blob/main/docs/business/README.md). Decisions:
[ADR-078](https://github.com/ihabkhaled/ClawAI/blob/main/docs/13-adr/adr-078-payg-connector-credit.md),
[ADR-097](https://github.com/ihabkhaled/ClawAI/blob/main/docs/13-adr/adr-097-display-fx-separate-from-settlement-fx.md).

## 10. Every provider, routed well — Shipped

| Capability                                                                                                                                                                                                                                                                                                                                        | Evidence                                                                                                                                       | Limits                                                             |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| 22 usable providers: OpenAI, Anthropic, Google Gemini, DeepSeek, xAI Grok, Ollama and llama.cpp, plus 15 OpenAI-compatible presets — OpenRouter, Groq, Cerebras, SambaNova, DeepInfra, Fireworks, Together, Mistral, Moonshot (Kimi), Z.ai (GLM), Alibaba Model Studio (Qwen), Cloudflare Workers AI, Vercel AI Gateway, Perplexity Sonar, Cohere | `packages/shared-types/src/enums/connector-provider.enum.ts`; `packages/shared-utilities/src/connector-presets/connector-presets.constants.ts` | AWS Bedrock is in the enum but is **scaffolding** — do not list it |
| The public model catalog is the real one                                                                                                                                                                                                                                                                                                          | `public-model-catalog.controller.ts`; `apps/claw-frontend/src/lib/models/public-models-api.ts`                                                 | —                                                                  |
| AUTO routing aware of modality and context window                                                                                                                                                                                                                                                                                                 | `modality-fit.utility.ts`; ADR-100                                                                                                             | —                                                                  |
| A provider whose account is out of credit is skipped fleet-wide (shared breaker), visible to admins on `/connectors`                                                                                                                                                                                                                              | `provider-breaker.store.ts`, `provider-breaker-admin.controller.ts`                                                                            | Key-credit preflight is OpenRouter only                            |

Decisions: [ADR-100](https://github.com/ihabkhaled/ClawAI/blob/main/docs/13-adr/adr-100-router-candidates-and-per-model-context-fit.md),
[ADR-117](https://github.com/ihabkhaled/ClawAI/blob/main/docs/13-adr/adr-117-connector-presets-one-registry-generic-adapter.md),
[ADR-124](https://github.com/ihabkhaled/ClawAI/blob/main/docs/13-adr/adr-124-provider-key-credit-preflight-and-one-retry.md),
[ADR-125](https://github.com/ihabkhaled/ClawAI/blob/main/docs/13-adr/adr-125-provider-refusals-recover-at-the-chokepoint.md).

## 11. Coding Agent for VS Code — Shipped (client in a separate repository)

The extension lives in its own repository, mounted as the `apps/claw-coding-agent`
submodule, and ships as a VSIX. Server side, verified here: browser-approved PKCE
sign-in (`vscode-authorization.controller.ts`), agent conversations kept apart
from the user's own, the shared context gateway, and an organisation policy that
can only narrow what the agent may do (`fleet.controller.ts` `GET
agent/organizations/policy/effective`). Organisation policy is **API only** — no
admin UI. Client-side behaviour (for example run recovery after a restart) is
documented in the extension repository, not verified from this one.
See [Coding Agent](https://github.com/ihabkhaled/ClawAI/blob/main/wiki/Coding-Agent.md).

## 12. Teams and administration — Partial

| Capability                                                                       | Status  | Evidence                                                                                               |
| -------------------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------ |
| Admins create, activate, deactivate and re-role users; temporary passwords       | Shipped | `apps/claw-auth-service/src/modules/users/controllers/users.controller.ts`                             |
| Super-administrator with escalation guards                                       | Shipped | ADR-073                                                                                                |
| Plan grants with a duration (1–60 months) and a required reason                  | Shipped | `plans.controller.ts`; `plan-grant.constants.ts`                                                       |
| Per-user usage and subscription statistics                                       | Shipped | `admin-user-statistics.controller.ts`                                                                  |
| Roles and a permission matrix; pages gated by permission                         | Shipped | `roles.controller.ts`; `permission-matrix.tsx`; system roles Administrator and User, plus custom roles |
| Share a conversation by public link; share context packs at workspace visibility | Shipped | ADR-075, ADR-036                                                                                       |

**Gaps — never claim these:**

| Not built                                                             | What exists instead                                                                    |
| --------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| **SSO** (SAML/OIDC sign-in to the web app)                            | A SAML callback in the coding-agent fleet module that creates no session and has no UI |
| **A multi-member team account** — seats, shared billing, pooled usage | Each user has their own plan and quota; the Team plan is a larger per-user tier        |
| **An admin UI for organisation policy**                               | The fleet API only                                                                     |

These are tracked as REQ-POS-005 and REQ-POS-006 in the
[requirements register](https://github.com/ihabkhaled/ClawAI/blob/main/docs/02-business-product/requirements-register.md).

## 13. Observability — Shipped (admin-facing)

| Capability                                                          | Evidence                                                                                  |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Status page with component uptime and incidents, for admins         | `status-page.controller.ts`; `apps/claw-frontend/src/app/(portal)/observability/page.tsx` |
| Grafana behind the admin session; Prometheus keeps 30 days          | ADR-113, ADR-115                                                                          |
| Every container's log in one store; read-only ops tokens (API only) | ADR-101, ADR-102                                                                          |
| Health fan-out covers ClamAV and the scraper sidecars               | `health.constants.ts` `DEPENDENCY_PROBES`                                                 |

The status page is **not public**.

## 14. Local-first and privacy — Shipped

| Capability                                                                                      | Evidence                                                                  | Limits                                        |
| ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | --------------------------------------------- |
| Local models through Ollama and llama.cpp                                                       | `apps/claw-ollama-service`, `apps/claw-llamacpp-service`                  | llama.cpp keeps one model resident            |
| Local image generation (Stable Diffusion WebUI, ComfyUI)                                        | `stable-diffusion.adapter.ts`, `image-execution.manager.ts`               | —                                             |
| The whole stack on your own hardware, GPU overlay picked automatically                          | `scripts/claw.sh`                                                         | Local AI is **off by default** (`--local-ai`) |
| File retention sweeps; memory pause, retention and redaction controls; memory export and import | `file-retention-sweeper.manager.ts`; `MemoryPreference`; ADR-034, ADR-053 | —                                             |

## 15. Reliability — Shipped

| Capability                                                                                           | Evidence                                            | Limits                                                                                    |
| ---------------------------------------------------------------------------------------------------- | --------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| chat-service scales horizontally; any replica serves any stream (Redis pub/sub plus a replay buffer) | `chat-stream-bus.service.ts`; ADR-077               | Replicas default to 1                                                                     |
| A dropped stream resumes from `Last-Event-ID`                                                        | `chat-stream.controller.ts`                         | Replay holds the last 100 frames; a full page refresh gets the finished answer by polling |
| Stop works across replicas                                                                           | `stream-cancellation.service.ts`                    | —                                                                                         |
| Rolling one-replica-at-a-time deploys                                                                | `scripts/deploy-prod.sh` `rolling_recreate_service` | —                                                                                         |

Decision: [ADR-076](https://github.com/ihabkhaled/ClawAI/blob/main/docs/13-adr/adr-076-chat-stream-durability.md).

---

## Known documentation drift found by this audit

- [ADR-087](https://github.com/ihabkhaled/ClawAI/blob/main/docs/13-adr/adr-087-cross-thread-retrieval.md) says cross-thread context
  is off by default; it has been on by default since migration
  `20260917000000_cross_thread_context_on_by_default`.
- The Team plan's seeded description ("Shared workspaces and a large pooled
  allowance") promises pooling that does not exist — REQ-POS-005.
