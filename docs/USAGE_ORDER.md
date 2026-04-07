# Audit Prompt Pack — Usage Order

## Overview

The ClawAI audit prompt pack consists of 13 prompts designed to systematically audit, harden, and prepare the platform for release. This document explains the ideal execution order and provides workflows for different team sizes.

---

## Ideal Execution Order

### Phase 1: Understand (Prompts 01-03)

| Step | Prompt | Purpose | Depends On |
|---|---|---|---|
| 1 | **01 — Master Audit** | Get the full picture across all services, identify systemic issues, establish baseline | Nothing |
| 2 | **02 — Backend Architecture** | Audit data layer, API contracts, service boundaries, database schemas | Master audit findings |
| 3 | **03 — Frontend Architecture** | Audit UI/UX layer, component structure, API integration, i18n | Master audit findings |

**Why this order:** You cannot fix what you do not understand. The master audit provides the map. Backend and frontend audits provide the detailed terrain. These three documents give you the complete picture before you start fixing anything.

### Phase 2: Harden Core Logic (Prompts 04-06)

| Step | Prompt | Purpose | Depends On |
|---|---|---|---|
| 4 | **04 — Routing Architecture** | Harden AI routing decisions, policy enforcement, health-aware selection | Backend audit |
| 5 | **05 — Memory/Context Architecture** | Fix context assembly, memory injection, deduplication, relevance | Backend audit |
| 6 | **06 — File Support Architecture** | Fix file pipeline, chunking, retrieval, grounding | Backend audit |

**Why this order:** Routing determines which model answers. Memory/context determines what the model knows. Files determine what documents the model can reference. These three systems directly affect AI response quality — the core value proposition. Fix them before anything else.

### Phase 3: Verify Infrastructure (Prompts 07-08)

| Step | Prompt | Purpose | Depends On |
|---|---|---|---|
| 7 | **07 — Logging/Observability** | Verify you can see what is happening across all services | Core logic fixes |
| 8 | **08 — Docker/DevOps** | Verify development experience, build pipeline, deployment path | Core logic fixes |

**Why this order:** Once the core logic is hardened, you need to verify that your observability can detect issues and your DevOps can deploy changes. These are force multipliers — they make everything else faster.

### Phase 4: Quality Assurance (Prompt 09)

| Step | Prompt | Purpose | Depends On |
|---|---|---|---|
| 9 | **09 — Testing/QA** | Add missing tests, enforce coverage thresholds, fix CI pipeline | All previous audits |

**Why this order:** Tests codify the fixes from Phases 2-3. Writing tests before fixing issues means testing broken behavior. Writing tests after fixing means testing correct behavior.

### Phase 5: Production Hardening (Prompt 10)

| Step | Prompt | Purpose | Depends On |
|---|---|---|---|
| 10 | **10 — Security Hardening** | Add TLS, circuit breakers, DLQ, secret management, vulnerability scanning | All previous phases |

**Why this order:** Security hardening is the final layer before release. It assumes the system works correctly (tested), is observable (logged), and is deployable (Docker). Adding TLS to a broken system just encrypts the bugs.

### Phase 6: Release Decision (Prompt 11)

| Step | Prompt | Purpose | Depends On |
|---|---|---|---|
| 11 | **11 — Release Readiness Scorecard** | Final scoring and go/no-go decision | All previous phases |

**Why this order:** The scorecard is meaningless until all other audits are complete. It synthesizes findings from every dimension into a single decision.

### Supporting Documents (Prompts 12-13)

| Step | Prompt | Purpose | When to Use |
|---|---|---|---|
| 12 | **12 — Usage Order (this document)** | Execution planning | Before starting any audit |
| 13 | **13 — Operating Rules** | Enforcement rulebook | Reference during all audits |

---

## Workflow: Solo Developer

```
Week 1: Understand
  Day 1-2: Run Prompt 01 (Master Audit) — read everything, take notes
  Day 3-4: Run Prompt 02 (Backend) — deep dive into services
  Day 5:   Run Prompt 03 (Frontend) — deep dive into UI

Week 2: Harden
  Day 1-2: Run Prompt 04 (Routing) — fix routing issues found
  Day 3:   Run Prompt 05 (Memory) — fix context assembly
  Day 4:   Run Prompt 06 (Files) — fix file pipeline
  Day 5:   Run Prompt 07 (Logging) — verify observability

Week 3: Verify and Test
  Day 1:   Run Prompt 08 (Docker) — verify dev experience
  Day 2-3: Run Prompt 09 (Testing) — add missing tests
  Day 4-5: Run Prompt 10 (Security) — harden for deployment

Week 4: Release
  Day 1:   Run Prompt 11 (Release Scorecard) — make go/no-go decision
  Day 2-5: Fix any blockers identified in scorecard
```

**Total estimated time:** 4 weeks (1 developer, full-time)

---

## Workflow: Small Team (2-3 developers)

```
Week 1: Understand (everyone)
  All: Run Prompt 01 (Master Audit) together
  Dev A: Run Prompt 02 (Backend)
  Dev B: Run Prompt 03 (Frontend)

Week 2: Harden (parallel tracks)
  Dev A: Prompts 04 (Routing) + 05 (Memory)
  Dev B: Prompt 06 (Files) + 07 (Logging)
  Dev C (or A/B split): Prompt 08 (Docker)

Week 3: Quality (parallel)
  Dev A: Prompt 09 (Testing) — backend tests
  Dev B: Prompt 09 (Testing) — frontend/E2E tests
  Dev C: Prompt 10 (Security)

Week 4: Release
  All: Run Prompt 11 (Release Scorecard) together
  All: Fix blockers
```

**Total estimated time:** 2-3 weeks (2-3 developers)

---

## Workflow: Larger Team (4+ developers)

```
Sprint 1 (1 week): Full Audit
  Lead:  Prompt 01 (Master Audit) — present findings to team
  Dev A: Prompt 02 (Backend) 
  Dev B: Prompt 03 (Frontend)
  Dev C: Prompt 04 (Routing) + 05 (Memory)
  Dev D: Prompt 06 (Files) + 07 (Logging) + 08 (Docker)

Sprint 2 (1 week): Fix and Harden
  All:   Parallel fixes based on audit findings
  Dev A: Backend fixes + Prompt 10 (Security)
  Dev B: Frontend fixes + E2E test setup
  Dev C: Routing + Memory fixes
  Dev D: File pipeline + Observability fixes

Sprint 3 (3-5 days): Test and Release
  All:   Prompt 09 (Testing) — write tests for all fixes
  Lead:  Prompt 11 (Release Scorecard) — final sign-off
  All:   Fix remaining blockers
```

**Total estimated time:** 2-3 weeks (4+ developers)

---

## Dependency Graph

```
                    ┌──────────┐
                    │ 01 Master│
                    │  Audit   │
                    └────┬─────┘
                   ┌─────┼──────┐
                   ▼     ▼      ▼
              ┌────────┐ ┌────────┐
              │02 Back │ │03 Front│
              │ end    │ │ end    │
              └───┬────┘ └────────┘
          ┌───────┼───────┐
          ▼       ▼       ▼
     ┌────────┐┌────────┐┌────────┐
     │04 Route││05 Mem/ ││06 File │
     │  ing   ││Context ││Support │
     └───┬────┘└───┬────┘└───┬────┘
          └────────┼─────────┘
                   ▼
          ┌────────────────┐
          │ 07 Logging     │
          │ 08 Docker      │
          └───────┬────────┘
                  ▼
          ┌────────────────┐
          │ 09 Testing     │
          └───────┬────────┘
                  ▼
          ┌────────────────┐
          │ 10 Security    │
          └───────┬────────┘
                  ▼
          ┌────────────────┐
          │ 11 Release     │
          │ Scorecard      │
          └────────────────┘

  Always available:
  ┌────────────────┐  ┌────────────────┐
  │ 12 Usage Order │  │ 13 Operating   │
  │ (this doc)     │  │    Rules       │
  └────────────────┘  └────────────────┘
```

---

## Key Principles

1. **Understand before fixing** — Prompts 01-03 before anything else
2. **Fix core before periphery** — Routing/Memory/Files before Logging/Docker
3. **Test after fixing** — Write tests for correct behavior, not broken behavior
4. **Secure last** — Security hardening assumes the system works correctly
5. **Score at the end** — The scorecard synthesizes all findings
6. **Rules always apply** — Operating Rules (Prompt 13) are referenced throughout
