# Routing Flagship — Scaffolding Index

**Branch:** `feature/routing-flagship-implementation`
**Source plan:** `plan-prompts/ClawAI_routing_implementation_flagship_pack/`
**Audit basis:** `docs/15-ai-context/routing-system-audit.md`

**Scope of this branch:** _Scaffolding only_ — per-stream module folders, type/constant stubs, doc per stream listing what's required, env-var stubs, future-model markers. No production wiring, no tests, no DB migrations, no nginx changes. Each stream doc is the single source of truth for what an implementing agent needs to do.

## Streams in execution order

| #   | Stream                                                  | Doc                                                                            | New modules scaffolded                                                           |
| --- | ------------------------------------------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| 00  | Master plan (meta)                                      | [00-master-plan.md](./00-master-plan.md)                                       | —                                                                                |
| 01  | R.1 Close learning loop                                 | [01-r1-learning-loop.md](./01-r1-learning-loop.md)                             | extension on `routing/` (learned-bias util + manager)                            |
| 02  | R.1/R.3 v2 evaluator canary                             | [02-r1r3-v2-evaluator-canary.md](./02-r1r3-v2-evaluator-canary.md)             | extension on `route-evaluator/` (canary-bucket)                                  |
| 03  | R.2 Multimodal intent detection                         | [03-r2-multimodal-intent-detection.md](./03-r2-multimodal-intent-detection.md) | NEW module `modality-detection/`                                                 |
| 04  | R.3 Workflow orchestrator goes live                     | [04-r3-workflow-orchestrator.md](./04-r3-workflow-orchestrator.md)             | extension on `workflows/` (13 workflow handler stubs)                            |
| 05  | R.4 Cost budget intelligence — **SUPERSEDED (ADR-081)** | [05-r4-cost-budget-intelligence.md](./05-r4-cost-budget-intelligence.md)       | Deleted. Per-user spend capping is owned by the auth-service PAYG credit wallet. |
| 06  | R.5 Operator playground + transparency                  | [06-r5-operator-playground.md](./06-r5-operator-playground.md)                 | NEW module `playground/`, FE pages                                               |
| 07  | R.6 Multi-tenant fleet routing                          | [07-r6-multi-tenant-fleet.md](./07-r6-multi-tenant-fleet.md)                   | extension on `routing/policies` (orgId, propagation)                             |
| 08  | R.7 i18n non-English routing                            | [08-r7-i18n-non-english.md](./08-r7-i18n-non-english.md)                       | NEW module `language-detection/`                                                 |
| 09  | R.8 Advanced routing intelligence                       | [09-r8-advanced-intelligence.md](./09-r8-advanced-intelligence.md)             | NEW module `intelligence/` (9 sub-features)                                      |
| 10  | R.9 Quality + reliability hardening                     | [10-r9-quality-hardening.md](./10-r9-quality-hardening.md)                     | test scaffolds + QA scripts                                                      |
| 11  | Quick wins backlog                                      | [11-quick-wins.md](./11-quick-wins.md)                                         | 10 single-day tickets                                                            |
| 12  | Business positioning + release roadmap                  | [12-business-roadmap.md](./12-business-roadmap.md)                             | docs only                                                                        |

## Module scaffolds in this branch

Each new module folder contains: `module.ts`, `controllers/`, `services/`, `managers/`, `repositories/`, `dto/`, `types/`, `constants/`, `enums/` (where applicable). All methods are stubs that throw `NotImplementedError('SCAFFOLD-Rx')` so the module is discoverable but inert.

```
apps/claw-routing-service/src/modules/
├── modality-detection/   (Stream 03 — R.2)
├── cost-budget/          (Stream 05 — R.4) — DELETED, see ADR-081
├── playground/           (Stream 06 — R.5)
├── language-detection/   (Stream 08 — R.7)
└── intelligence/         (Stream 09 — R.8)
```

Extensions on existing modules are documented in their per-stream docs; no skeleton files are added to existing modules to avoid conflicts with the other agent on `main`.

## Future Prisma models (scaffold marker — NOT yet in schema.prisma)

Listed in [PRISMA_FUTURE_MODELS.md](./PRISMA_FUTURE_MODELS.md). Add via migration when implementing each stream.

## New environment variables

Listed in [ENV_ADDITIONS.md](./ENV_ADDITIONS.md). Copy block into `.env.example` + `.env` + `scripts/install.{sh,ps1}` when activating a stream.

## Conventions used in this scaffold

1. Every stub method body: `throw new Error('SCAFFOLD-Rx — not implemented; see docs/15-ai-context/routing-flagship-streams/0X-name.md');`
2. Every stub file has a top-of-file comment: `// SCAFFOLD: stream Rx (NN-name) — replace this stub with real implementation before activation.`
3. Modules are NOT registered in `app.module.ts` — they're discoverable but won't load at runtime.
4. Prisma changes live in `PRISMA_FUTURE_MODELS.md` until activation — schema.prisma is untouched.
5. i18n keys live in per-stream doc tables, not in locale files yet — adding them now without backend support would leak fake-feature strings to users.

## Activation sequence (recommendation)

Per the audit's leverage analysis, activate in this order:

```
01-r1-learning-loop          →  the single biggest win
02-r1r3-v2-evaluator-canary  →  unlocks the rest
04-r3-workflow-orchestrator  →  needs 01 + 02
03-r2-multimodal-detection   →  needs 04 for routing the detected intents
05-r4-cost-budget            →  SUPERSEDED (ADR-081) — not to be implemented
06-r5-playground             →  no production risk; can run any time
08-r7-i18n                   →  user-visible win
07-r6-multi-tenant           →  blocked on org schema
09-r8-advanced               →  pick individual sub-features
10-r9-quality                →  ongoing alongside everything
```

Quick wins (Stream 11) can ship out-of-order; they're explicitly designed to be safe.
