# Service Catalog

One entry per backend service. Derived from `.ai/manifests/services.json`
(path, port, DB, models, deps), `event-graph.json` (produced/consumed events),
`api-endpoints.json` (routes), and `nginx-routes.json` (gateway prefix). When any
of these drift, regenerate the manifests and update this file.

Every service depends on `@claw/shared-constants`, `@claw/shared-types`,
`@claw/shared-utilities` (health depends on shared-utilities only); most also on
`@claw/shared-rabbitmq` and `@claw/shared-entitlements`. Only agent, research,
workspace add `@claw/shared-auth`. All 16 non-health services publish
`log.server`.

---

## claw-auth-service — :4001 · PostgreSQL

- **Path:** `apps/claw-auth-service` · **Gateway:** `/api/v1/auth`, `/api/v1/users`, `/api/v1/admin`
- **Owns:** User, Session, Role, RolePermission, Plan, PlanModelAccess, UserPlanAssignment, TokenUsageLedger, SystemSetting
- **Responsibility:** JWT + refresh-token rotation (argon2), RBAC roles/permissions, plans & entitlements, quota reserve/finalize/release (`/internal/quota/*`), user CRUD.
- **Produces:** `user.created`, `user.deactivated`, `user.login`, `user.logout`, `user.role_changed`.
- **Pitfalls:** identity/permission changes are the authentication-security pack — read `rules/08-security-rules.md`. Quota endpoints are internal-only.

## claw-chat-service — :4002 · PostgreSQL

- **Path:** `apps/claw-chat-service` · **Gateway:** `/api/v1/chat-threads`, `/api/v1/chat-messages`
- **Owns:** ChatThread, ChatMessage, ChatMessageContextReceipt, MessageAttachment, FileDeliveryRecord
- **Responsibility:** threads/messages, context assembly (pulls memories, context packs, file chunks over HTTP), execution + fallback, SSE streaming (`stream/:threadId`), multi-model modes (parallel, best-of-n, consensus, cost-ensemble, decompose, escalation-chain, pipeline, role-pack, verify, repair).
- **Produces:** `message.created`, `message.completed`, `message.routed` (consumed), `message.feedback_set`, `context.receipt_written`, `chat_thread.memory_toggled`, `chat_thread.context_toggled`.
- **Consumes:** `message.routed` (from routing).
- **Pitfalls:** SSE routes need `@SkipLogging()`, `@SkipThrottle()`, and nginx `proxy_buffering off`. When all providers fail you MUST store an error ASSISTANT message or the frontend polls forever (see `CLAUDE.md` "Fallback & Error Handling").

## claw-connector-service — :4003 · PostgreSQL

- **Path:** `apps/claw-connector-service` · **Gateway:** `/api/v1/connectors`, `/api/v1/models`
- **Owns:** Connector, ConnectorModel, ConnectorHealthEvent, ModelSyncRun
- **Responsibility:** 7 cloud/local providers, AES-256-GCM-encrypted config, health checks, model sync, `/internal/connectors/config` for other services.
- **Produces:** `connector.created/updated/deleted`, `connector.synced`, `connector.health_checked`.
- **Consumers of its events:** audit + routing (synced, health_checked).
- **Pitfalls:** never expose `encryptedConfig`/API keys in responses. Vendor SDKs go in adapters only.

## claw-routing-service — :4004 · PostgreSQL

- **Path:** `apps/claw-routing-service` · **Gateway:** `/api/v1/routing`
- **Owns:** RoutingDecision, RoutingPolicy, RouterModelRegistry/Profile/Topic/Learned scores, ReplayRun/Case, RouterCircuitBreaker, RoutingFeedback/Outcome records, TaxonomyRole, and more (14 models).
- **Responsibility:** 5-stage AUTO pipeline (privacy → image → file → category → Ollama/heuristic), 7 routing modes, policies, replay lab, circuit breakers, learning loop.
- **Produces:** `routing.models.synced`, plus routing profile/circuit-breaker lifecycle events.
- **Consumes:** `message.created`, `message.completed`, `connector.synced/health_checked`, `model.pulled/deleted`, `llamacpp.model.loaded/unloaded/crashed`, routing profile events. Publishes `message.routed` back to chat.
- **Pitfalls:** model-routing pack; largest endpoint surface after workspace (57). Router prompt is built dynamically from installed models (5-min TTL cache).

## claw-memory-service — :4005 · PostgreSQL (pgvector)

- **Path:** `apps/claw-memory-service` · **Gateway:** `/api/v1/memories`, `/api/v1/context-packs`, `/api/v1/context`, `/api/v1/memory`
- **Owns:** MemoryRecord, MemorySuggestion, MemoryUsage, MemoryAuditLog, MemoryPreference, ContextPack(+Item/Version/Usage/Attachment/Template), WorkspaceObjectEmbedding
- **Responsibility:** memory CRUD + suggestion queue, extraction, sensitivity classification, retrieval bundle (`/internal/memories/retrieve`), context packs V2.
- **Produces:** `memory.extracted/suggested/approved/rejected/used/forgotten/redacted`, `context_pack.version_created/version_reverted`.
- **Consumes:** `message.completed` (extraction).
- **Pitfalls:** MEMORY_V2/CONTEXT_V2/RETRIEVAL_V2 flags gate behavior; retrieval token guard.

## claw-file-service — :4006 · PostgreSQL

- **Path:** `apps/claw-file-service` · **Gateway:** `/api/v1/files`
- **Owns:** File, FileChunk
- **Responsibility:** upload + 4-check security (ClamAV, magic bytes, filename, ZIP bomb), chunking (JSON/CSV/MD/text), OCR (optional), retention sweep, `/internal/files/*` for chat/image.
- **Produces:** `file.uploaded/chunked/deleted/downloaded/failed`, `file.upload_started/completed`, `file.ocr_started/completed/failed`, `file.extraction_failed`, `file.retention_expired`, `file.archive_expanded`.
- **Pitfalls:** ClamAV fail-safe rejects on scanner down; ZIP guardrails run before extraction.

## claw-audit-service — :4007 · MongoDB

- **Path:** `apps/claw-audit-service` · **Gateway:** `/api/v1/audits`, `/api/v1/usage`
- **Owns:** AuditLog, UsageLedger (Mongoose)
- **Responsibility:** the near-universal event consumer — records audit events + usage/cost/latency ledger.
- **Consumes:** almost every lifecycle event (agent capability, ai_action, connector, file, llamacpp, memory, message.completed, routing, user, workspace sync/action). See [event-flow-map.md](event-flow-map.md).
- **Pitfalls:** consumer-heavy; handlers must not swallow errors.

## claw-ollama-service — :4008 · PostgreSQL

- **Path:** `apps/claw-ollama-service` · **Gateway:** `/api/v1/ollama`
- **Owns:** LocalModel, LocalModelRoleAssignment, ModelCatalogEntry, ModelDiscovery(Run/Candidate/Source), PullJob, RuntimeConfig
- **Responsibility:** local model management, roles (ROUTER/CODING/…), catalog (142 models), pull jobs (SSE progress), generation, discovery.
- **Produces:** `connector.synced`, `connector.updated` (syncs local models as a connector). Gated by `local-ai` compose profile.
- **Pitfalls:** only runs when `--local-ai` is enabled; ROUTER-role models are excluded from user model selectors.

## claw-health-service — :4009 · no DB

- **Path:** `apps/claw-health-service` · **Gateway:** `/api/v1/health`
- **Owns:** nothing. Depends only on `@claw/shared-utilities`.
- **Responsibility:** aggregates `/health` from all services. New services must be added to its check list.

## claw-client-logs-service — :4010 (env-only) · MongoDB

- **Path:** `apps/claw-client-logs-service` · **Gateway:** `/api/v1/client-logs`
- **Owns:** ClientLog (Mongoose, TTL 30d)
- **Responsibility:** batched frontend log ingestion + stats.
- **Pitfalls:** **no `*_SERVICE_PORT` constant** — port is `CLIENT_LOGS_PORT` env-only. Flagged in the inventory audit. See [port-and-service-map.md](port-and-service-map.md).

## claw-server-logs-service — :4011 (env-only) · MongoDB

- **Path:** `apps/claw-server-logs-service` · **Gateway:** `/api/v1/server-logs`
- **Owns:** ServerLog (Mongoose, TTL 30d)
- **Responsibility:** consumes `log.server` from all 16 services; Elasticsearch-ready backend log viewer.
- **Pitfalls:** **no port constant** — port is `SERVER_LOGS_PORT` env-only.

## claw-image-service — :4012 · PostgreSQL

- **Path:** `apps/claw-image-service` · **Gateway:** `/api/v1/images`
- **Owns:** ImageGeneration, ImageGenerationAsset, ImageGenerationEvent
- **Responsibility:** image generation (DALL-E/Gemini/SD/ComfyUI adapters), retry/retry-alternate, `/internal/images/generate`, SSE progress (SD WebUI + ComfyUI adapters).
- **Pitfalls:** `image.generated`/`image.failed` patterns declared; ComfyUI/SD gated by `local-ai`.

## claw-file-generation-service — :4013 · PostgreSQL

- **Path:** `apps/claw-file-generation-service` · **Gateway:** `/api/v1/file-generations`
- **Owns:** FileGeneration, FileGenerationAsset, FileGenerationEvent
- **Responsibility:** file export (PDF/DOCX/CSV/HTML/MD/TXT/JSON), retry, `/internal/file-generations/generate`.

## claw-workspace-service — :4014 · PostgreSQL

- **Path:** `apps/claw-workspace-service` · **Gateway:** `/api/v1/workspace`
- **Owns:** 25 models — WorkspaceConnector(+Grant), WorkspaceObject(+Link/Embedding), WorkspaceSyncRun, WorkspaceChain(+Run/Step), AiActionPolicy/ApprovalQueue, WebhookDelivery, AutoSuggestRun, SuggestionTriggerRule/Deduplication, DigestSnapshot, and more.
- **Responsibility:** 12 workspace connectors (GitHub, GitLab, Jira, Slack, Drive, OneDrive, SharePoint, Confluence, Figma, Gmail, Bitbucket, ClickUp), OAuth2/PKCE, webhooks, scheduled sync, AI actions with approval queue, auto-suggest.
- **Produces:** the largest event set — `workspace.sync.*`, `workspace_action.*`, `workspace_connector.*`, `workspace_object.synced`, `ai_action.*`, `workspace.auto_suggest.*`, `workspace.webhook.*`, `memory.preference.upserted`.
- **Pitfalls:** largest service (103 endpoints, 66 test files); security-sensitive (OAuth secrets, webhook signatures).

## claw-agent-service — :4015 · PostgreSQL

- **Path:** `apps/claw-agent-service` · **Gateway:** `/api/v1/agent`
- **Owns:** AgentSession, Device, PairingRequest, DeviceCodeRequest, RefreshToken, TerminalCommand, ScheduledCommand, CapabilityInvocation, AccessPolicy, Recipe(+Run/Step), ActivityMemoryEntry, AgentSuggestion, LocalRepo, FileWatchEvent, Marketplace(Listing/Install), Organization(+Member)
- **Responsibility:** desktop agent — device pairing/auth, terminal command approval, capability framework (filesystem/process/…), recipes, fleet/org, marketplace, activity memory. Imports `@claw/shared-auth`.
- **Produces:** `agent.session_connected/disconnected`, `agent.device_paired/revoked`, `agent.token_rotated/reuse_detected`, `agent.policy_violated`, `agent.command_*`, `agent.capability.*` (12 patterns).
- **Pitfalls:** every capability needs a DeviceScope + default AccessPolicy + audited event; no silently allowed actions.

## claw-research-service — :4016 · PostgreSQL

- **Path:** `apps/claw-research-service` · **Gateway:** `/api/v1/research`
- **Owns:** SearchProvider, SearchRun, ResearchRun, FetchJob, PageCache
- **Responsibility:** dynamic search/fetch/scrape/clone + evidence orchestration (Tavily, SearXNG, Ollama Web). Imports `@claw/shared-auth`.

## claw-llamacpp-service — :4017 · PostgreSQL (Debian base)

- **Path:** `apps/claw-llamacpp-service` · **Gateway:** `/api/v1/llamacpp`
- **Owns:** FrontierCatalogEntry, BinaryRelease, PullJob, HardwareSnapshot, ModelLoadEvent, PreflightOverrideAudit, RuntimeConfig
- **Responsibility:** local frontier LLMs via vanilla llama.cpp — binary lifecycle, HF pull jobs (SSE), single-resident process supervisor, OpenAI-compatible inference proxy, hardware preflight.
- **Produces:** `llamacpp.binary.installed/updated`, `llamacpp.pull.*`, `llamacpp.model.loaded/unloaded/crashed` (routing consumes these), `llamacpp.weights.deleted`, `llamacpp.preflight.overridden`.
- **Pitfalls:** base image MUST be Debian (`node:20-bookworm-slim`) — release binaries are glibc-linked. `LLAMACPP_DATA_PATH` must live in the named volume. Has GPU overlays in compose.
