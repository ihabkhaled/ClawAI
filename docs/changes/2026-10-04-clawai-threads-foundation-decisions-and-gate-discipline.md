# Change - ClawAI Threads foundation, decisions, and gate discipline

## Files

- `apps/claw-health-service/src/modules/health/constants/__tests__/health.constants.spec.ts` (A)
- `apps/claw-thread-generation-service/AGENTS.md` (A)
- `apps/claw-thread-generation-service/CLAUDE.md` (A)
- `apps/claw-thread-generation-service/Dockerfile` (A)
- `apps/claw-thread-generation-service/Dockerfile.dev` (A)
- `apps/claw-thread-generation-service/eslint.config.mjs` (A)
- `apps/claw-thread-generation-service/nest-cli.json` (A)
- `apps/claw-thread-generation-service/package.json` (A)
- `apps/claw-thread-generation-service/src/app/app.module.ts` (A)
- `apps/claw-thread-generation-service/src/app/config/__tests__/app.config.spec.ts` (A)
- `apps/claw-thread-generation-service/src/app/config/app.config.ts` (A)
- `apps/claw-thread-generation-service/src/main.ts` (A)
- `apps/claw-thread-generation-service/src/modules/health/controllers/health.controller.ts` (A)
- `apps/claw-thread-generation-service/src/modules/health/health.module.ts` (A)
- `apps/claw-thread-generation-service/src/modules/health/services/__tests__/health.service.spec.ts` (A)
- `apps/claw-thread-generation-service/src/modules/health/services/health.service.ts` (A)
- `apps/claw-thread-generation-service/src/modules/health/types/health.types.ts` (A)
- `apps/claw-thread-generation-service/src/vitest-globals.d.ts` (A)
- `apps/claw-thread-generation-service/tsconfig.build.json` (A)
- `apps/claw-thread-generation-service/tsconfig.json` (A)
- `apps/claw-thread-generation-service/vitest.config.ts` (A)
- `apps/claw-threads-service/AGENTS.md` (A)
- `apps/claw-threads-service/CLAUDE.md` (A)
- `apps/claw-threads-service/Dockerfile` (A)
- `apps/claw-threads-service/Dockerfile.dev` (A)
- `apps/claw-threads-service/eslint.config.mjs` (A)
- `apps/claw-threads-service/nest-cli.json` (A)
- `apps/claw-threads-service/package.json` (A)
- `apps/claw-threads-service/src/app/app.module.ts` (A)
- `apps/claw-threads-service/src/app/config/__tests__/app.config.spec.ts` (A)
- `apps/claw-threads-service/src/app/config/app.config.ts` (A)
- `apps/claw-threads-service/src/main.ts` (A)
- `apps/claw-threads-service/src/modules/health/controllers/health.controller.ts` (A)
- `apps/claw-threads-service/src/modules/health/health.module.ts` (A)
- `apps/claw-threads-service/src/modules/health/services/__tests__/health.service.spec.ts` (A)
- `apps/claw-threads-service/src/modules/health/services/health.service.ts` (A)
- `apps/claw-threads-service/src/modules/health/types/health.types.ts` (A)
- `apps/claw-threads-service/src/vitest-globals.d.ts` (A)
- `apps/claw-threads-service/tsconfig.build.json` (A)
- `apps/claw-threads-service/tsconfig.json` (A)
- `apps/claw-threads-service/vitest.config.ts` (A)
- `docs/02-business-product/clawai-threads-product-spec.md` (A)
- `docs/03-architecture/clawai-threads-architecture.md` (A)
- `docs/13-adr/adr-159-clawai-threads-two-service-architecture.md` (A)
- `docs/qa-evidence/2026-10-04-threads-service-foundation.md` (A)
- `docs/superpowers/plans/2026-10-04-clawai-threads-implementation-plan.md` (A)
- `docs/superpowers/specs/2026-10-04-clawai-threads-design.md` (A)
- `memory/2026-10-04-clawai-threads-product-decisions.md` (A)
- `tools/__tests__/threads-nginx-routing.test.mjs` (A)
- `wiki/Threads.md` (A)
- `.ai/BOOTSTRAP.md` (M)
- `.ai/manifests/api-endpoints.json` (M)
- `.ai/manifests/docker-services.json` (M)
- `.ai/manifests/environment-variables.json` (M)
- `.ai/manifests/governance.json` (M)
- `.ai/manifests/hashes.json` (M)
- `.ai/manifests/nginx-routes.json` (M)
- `.ai/manifests/ports.json` (M)
- `.ai/manifests/repository.json` (M)
- `.ai/manifests/services.json` (M)
- `.ai/manifests/tests.json` (M)
- `.ai/manifests/workspace-dependency-graph.json` (M)
- `.ai/manifests/workspaces.json` (M)
- `.env.example` (M)
- `CLAUDE.md` (M)
- `apps/claw-health-service/AGENTS.md` (M)
- `apps/claw-health-service/src/modules/health/constants/health.constants.ts` (M)
- `context/port-and-service-map.md` (M)
- `context/service-catalog.md` (M)
- `context/service-dependency-map.md` (M)
- `docker/docker-compose.dev.services.yml` (M)
- `docker/docker-compose.prod.services.yml` (M)
- `docs/02-business-product/flagship-features.md` (M)
- `docs/02-business-product/product-roadmap.md` (M)
- `docs/02-business-product/requirements-register.md` (M)
- `docs/04-backend/services-index.md` (M)
- `docs/13-adr/adr-index.md` (M)
- `docs/features/ai-native-engineering-os/inventory.snapshot.json` (M)
- `docs/wiki/index.md` (M)
- `infra/nginx/.env.distributed.example` (M)
- `infra/nginx/locations.conf` (M)
- `infra/nginx/nginx.distributed.conf.template` (M)
- `package-lock.json` (M)
- `packages/shared-constants/src/index.spec.ts` (M)
- `packages/shared-constants/src/index.ts` (M)
- `rules/07-commit-rules.md` (M)
- `rules/23-git-commits-hooks-and-release-gates.md` (M)
- `rules/34-gate-economy-and-machine-resources.md` (M)
- `rules/48-lint-and-test-only-what-changed.md` (M)
- `scripts/install-tls.ps1` (M)
- `scripts/install-tls.sh` (M)
- `scripts/install.ps1` (M)
- `scripts/install.sh` (M)
- `skills/run-gates-once-and-land.md` (M)
- `skills/run-the-qa-team.md` (M)
- `wiki/Flagship-Features.md` (M)
- `wiki/Home.md` (M)
- `wiki/_Sidebar.md` (M)

- `DEEPSEEK.md` (M)
- `GLM.md` (M)
- `KIMI.md` (M)
- `MISTRAL.md` (M)
- `QWEN.md` (M)
- `cursor.md` (M)
- `apps/claw-chat-service/src/modules/chat-messages/constants/voice-note.constants.ts` (M)
- `apps/claw-file-service/src/modules/files/types/transcription-error.types.ts` (M)
- `tools/release/version.mjs` (M)
- `skills/add-a-voice-note-or-transcription-path.md` (M)
- `wiki/AI-Bootstrap-and-Authority.md` (M)
- `wiki/Architecture-Map.md` (M)
- `wiki/Docker-Guide.md` (M)
- `wiki/Docker-and-Local-Development.md` (M)
- `wiki/Repository-Map.md` (M)
- `wiki/Testing-and-QA.md` (M)
- `wiki/Workspace-Map.md` (M)

- `apps/claw-health-service/src/modules/health/constants/status-page.constants.ts` (M)
- `apps/claw-threads-service/package.json` (M)
- `apps/claw-thread-generation-service/package.json` (M)
- `package-lock.json` (M)
- `apps/claw-threads-service/Dockerfile` (M)
- `apps/claw-threads-service/Dockerfile.dev` (M)
- `apps/claw-thread-generation-service/Dockerfile` (M)
- `apps/claw-thread-generation-service/Dockerfile.dev` (M)
- `docs/04-backend/service-guide-threads.md` (A)
- `docs/04-backend/service-guide-thread-generation.md` (A)
- `docs/04-backend/services-index.md` (M)

- `package-lock.json` (M)

## Before

Before this batch, ClawAI had 18 backend services (25 workspaces), no Threads service boundary, and no documented Threads product decisions or machine-scoped gate receipt policy.

## Change

The owner approved a two-service Threads architecture, the launch and privacy rules, and bounded generation with existing credits. The batch adds health-only service shells, gateway/health/installer wiring, product and architecture decisions, QA evidence, and exact-tree receipts while preserving normal hooks.

## Now

Two health-only services are registered as workspaces 26 and 27. Two production rollouts failed health verification because probes did not match the HTTPS-enabled service runtime and slim image. The corrected loopback HTTPS probes passed release/deploy run 37215068639; both services are healthy on v1.175.2 (`cd2b1134d`). Threads launch remains disabled; publication behavior and generation pipeline are planned in later batches.

## Why

This creates safe deployment seams and records the owner decisions before domain code lands. Scoped receipts avoid duplicate pre-push test/build work for an unchanged tree while all hooks and integrity gates remain active.

## Deployment health-probe repair

Production run 37210254048 failed because its HTTPS probes depended on `wget`, absent from the Node 26 slim images. Run 37212580265 showed the first repair still used HTTP while production TLS was enabled from `/certs`; both services started and mapped `/api/v1/health`, but remained unhealthy. The correction uses Node's built-in HTTPS client for a loopback request and disables certificate verification only on that health probe. CI 37214571065 passed, and release/deploy run 37215068639 reported both services healthy. No new reusable skill or rule is needed.

Changed for this repair: `docker/docker-compose.dev.services.yml`, `docker/docker-compose.prod.services.yml`, `tools/__tests__/threads-compose-healthcheck.test.mjs`, `docs/03-architecture/clawai-threads-architecture.md`, `wiki/Threads.md`, `docs/superpowers/plans/2026-10-04-clawai-threads-implementation-plan.md`, `docs/qa-evidence/2026-10-04-threads-service-foundation.md`, and this trace. Knowledge delta: architecture, wiki, plan, QA evidence, and trace paths above.

## Batch 2 — Owner-scoped source snapshots and exports

Chat now serves `POST /api/v1/internal/thread-snapshots/:threadId` behind
`ServiceTokenGuard`. Its repository matches the supplied owner and thread,
reads both records and ordered messages in one serializable transaction, and
selects only fields required for filtering and snapshot construction. The
snapshot allow-list excludes system/tool roles, failure/abort/placeholder/
duplicate markers, known secret patterns, and metadata such as attachment IDs,
provider, and model. It rejects more than 2,000 source messages or 2 MiB rather
than returning a truncated transcript. The digest covers deterministic
versioned source data. Generation validates source identity, byte count, and
digest before returning it; JSON and Markdown exports are implemented. TOON is
explicitly unavailable because no verified codec and token-savings evidence
exist. Durable job pinning and role context-fit checks remain in later batches.

The same-batch knowledge delta is the Threads architecture and product privacy
spec, `wiki/Threads.md`, `wiki/Memory-and-Context-Architecture.md`,
`context/service-dependency-map.md`, the implementation plan, QA evidence, and
this change record. No new skill or rule was warranted. Targeted specs cover
filtering, determinism, size refusal, owner scoping, transaction isolation,
service-token HTTP enforcement, integrity validation, and exporter behavior.

Touched implementation paths: `apps/claw-chat-service/src/modules/chat-threads/chat-threads.module.ts`, `apps/claw-chat-service/src/modules/chat-threads/controllers/thread-snapshot-internal.controller.ts`, `apps/claw-chat-service/src/modules/chat-threads/controllers/__tests__/thread-snapshot-internal.controller.spec.ts`, `apps/claw-chat-service/src/modules/chat-threads/controllers/__tests__/thread-snapshot-internal.controller.integration.spec.ts`, `apps/claw-chat-service/src/modules/chat-threads/dto/thread-snapshot.dto.ts`, `apps/claw-chat-service/src/modules/chat-threads/repositories/chat-threads.repository.ts`, `apps/claw-chat-service/src/modules/chat-threads/repositories/__tests__/thread-snapshot.repository.spec.ts`, `apps/claw-chat-service/src/modules/chat-threads/services/thread-snapshot.service.ts`, `apps/claw-chat-service/src/modules/chat-threads/services/__tests__/thread-snapshot.service.spec.ts`, `apps/claw-chat-service/src/modules/chat-threads/constants/thread-snapshot.constants.ts`, `apps/claw-chat-service/src/modules/chat-threads/types/thread-snapshot.types.ts`, `apps/claw-chat-service/src/modules/chat-threads/utilities/thread-snapshot.utility.ts`, `apps/claw-chat-service/src/modules/chat-threads/utilities/__tests__/thread-snapshot.utility.spec.ts`, and `apps/claw-chat-service/src/modules/chat-threads/__tests__/chat-threads.service.spec.ts`.

Generation paths: `apps/claw-thread-generation-service/src/app/app.module.ts`, `apps/claw-thread-generation-service/src/app/config/app.config.ts`, `apps/claw-thread-generation-service/src/app/config/__tests__/app.config.spec.ts`, `apps/claw-thread-generation-service/src/modules/source-snapshots/chat-snapshot.client.ts`, `apps/claw-thread-generation-service/src/modules/source-snapshots/snapshot-exporters.ts`, `apps/claw-thread-generation-service/src/modules/source-snapshots/source-snapshots.module.ts`, `apps/claw-thread-generation-service/src/modules/source-snapshots/types/thread-snapshot.types.ts`, and the snapshot client/exporter specs in that module. Knowledge paths: `docs/03-architecture/clawai-threads-architecture.md`, `docs/02-business-product/clawai-threads-product-spec.md`, `wiki/Threads.md`, `wiki/Memory-and-Context-Architecture.md`, `context/service-dependency-map.md`, `docs/wiki/index.md`, `docs/wiki/security/sensitive-data.md`, `docs/superpowers/plans/2026-10-04-clawai-threads-implementation-plan.md`, `docs/qa-evidence/2026-10-04-threads-snapshots.md`, the generated `.ai/**` and touched service `AGENTS.md` files, the inventory snapshot, and this change record.
