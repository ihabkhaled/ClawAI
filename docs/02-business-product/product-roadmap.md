# Product Roadmap

## Current State (v0.2.0, April 2026)

ClawAI is a fully functional local-first AI orchestration platform with 13 NestJS microservices, a Next.js frontend, and comprehensive infrastructure. The platform is in active development with most features at GA status.

---

## What Is Done

### Core Platform (GA)
- 13 microservices with individual databases (9 PostgreSQL + 3 MongoDB)
- Next.js 16 frontend with React 19, TanStack Query, Zustand
- Nginx reverse proxy with 20+ route mappings
- Docker Compose deployment (~22 containers)
- Pre-commit quality gates (Prettier + ESLint + TypeScript + Build + Test)
- GitHub Actions CI/CD (lint -> typecheck -> test -> build)

### Chat & Messaging (GA)
- Thread management with per-thread settings
- Message sending with full routing pipeline
- Real-time SSE streaming
- File attachments, context packs, system prompts
- Temperature/max tokens configuration
- Regenerate, feedback, routing transparency

### Intelligent Routing (GA)
- 7 routing modes with Ollama-powered AUTO mode
- Category-aware routing (64 keywords)
- Dynamic prompt building from installed models
- Routing policies with priority system
- Heuristic fallback (10s timeout)
- Full fallback chain (primary -> fallback -> local -> error)

### Memory System (GA)
- Automatic extraction (FACT/PREFERENCE/INSTRUCTION/SUMMARY)
- Deduplication check
- CRUD with enable/disable
- Context packs with ordered items
- Integration into context assembly

### Model Catalog (GA)
- 30 models across 6 categories
- Real-time SSE download progress
- Role assignment (7 roles)
- Auto-pull on startup (configurable)

### Connectors (GA)
- 5 cloud providers (OpenAI, Anthropic, Gemini, DeepSeek, xAI)
- AES-256-GCM API key encryption
- Connection testing, model sync, health monitoring

### Image Generation (GA)
- 3 providers (DALL-E 3, Gemini Image, local SD)
- Intent detection (90+ keywords)
- Reference image support

### Auth & Security (GA)
- JWT + refresh token rotation
- RBAC (ADMIN/OPERATOR/VIEWER)
- Argon2 password hashing
- Rate limiting, Helmet headers, Zod validation

### Observability (GA)
- Audit logging (10 event types)
- Usage ledger tracking
- Health aggregation from all services
- Server/client log collection (30-day TTL)

### i18n (GA)
- 8 languages (EN, AR, DE, ES, FR, IT, PT, RU)
- Full RTL support for Arabic

---

## What Is In Progress

### File Generation (Beta)
- 7 format adapters implemented (PDF, DOCX, CSV, HTML, MD, TXT, JSON)
- Two-phase approach working (LLM content -> format conversion)
- Needs: PDF formatting quality, DOCX templates, error handling refinement

---

## Technical Debt Priorities

### Immediate (Critical)
1. **TD-017**: No automated backup strategy for 9 PG + 3 MongoDB databases

### Next Sprint (High)
2. **TD-008**: JWT stored in localStorage (XSS vulnerability) -- migrate to httpOnly cookies
3. **TD-014**: Single-instance services -- plan HA strategy
4. **TD-001**: ChatExecutionManager complexity (17, limit 15)
5. **TD-003**: detectImageFollowUp complexity (28, limit 15)
6. **TD-005**: Manager classes under-tested
7. **TD-011**: Context assembly N+1 HTTP calls

### Planned (Medium)
8. **TD-010**: Rate limiting per-user vs global
9. **TD-012**: Ollama router adaptive timeout
10. **TD-015**: Single RabbitMQ instance
11. **TD-016**: No database connection pooling
12. **TD-020**: No graceful shutdown handling

---

## Planned Features (Not Yet Started)

### Short-Term (Next Quarter)

| Feature | Priority | Description |
| --- | --- | --- |
| Automated Backups | Critical | pg_dump/mongodump cron jobs with off-host storage |
| httpOnly Cookie Auth | High | Migrate JWT storage from localStorage to cookies |
| Per-User Rate Limiting | High | Throttle by user ID, not just IP |
| Spending Alerts | High | Notify admins when cloud API spend exceeds thresholds |
| Spending Limits | High | Configurable per-user and global spending caps |
| Batch Context Fetch | Medium | Reduce N+1 HTTP calls in context assembly |

### Medium-Term (2-3 Quarters)

| Feature | Priority | Description |
| --- | --- | --- |
| Streaming Responses | High | Token-by-token streaming instead of wait-for-complete |
| Shared Context Packs | Medium | Organization-wide context packs (not just user-scoped) |
| Conversation Search | Medium | Full-text search across all threads and messages |
| Model Performance Dashboard | Medium | Track accuracy, latency, cost per model over time |
| Export Conversations | Medium | Download thread history as PDF/MD/JSON |
| Webhook Integrations | Medium | Trigger external webhooks on events |

### Long-Term (6+ Months)

| Feature | Priority | Description |
| --- | --- | --- |
| Kubernetes Deployment | High | Production-grade orchestration with horizontal scaling |
| Multi-Tenant Support | Medium | Organization-level isolation for SaaS deployment |
| Agent Tool Use | Medium | Allow AI to execute code, browse web, call APIs |
| RAG Pipeline | Medium | Vector search over uploaded documents |
| Custom Model Fine-Tuning | Low | Fine-tune local models on organization data |
| Plugin System | Low | Third-party extensions for providers and features |

---

## Version History

| Version | Date | Highlights |
| --- | --- | --- |
| v0.2.0 | 2026-04-09 | Model catalog (30 models), download manager, category-aware routing |
| v0.1.x | 2026-03-xx | Image generation, file generation scaffolding, 13 services complete |
| v0.0.x | 2026-02-xx | Core platform: chat, routing, memory, connectors, auth, audit |
