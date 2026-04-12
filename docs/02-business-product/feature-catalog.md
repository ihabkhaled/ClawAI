# ClawAI Feature Catalog

Complete catalog of every feature in the platform with status, description, and user stories.

Last updated: 2026-04-11

---

## Feature Status Legend

| Status     | Meaning                                       |
| ---------- | --------------------------------------------- |
| GA         | Generally available, production-ready         |
| Beta       | Functional, may have rough edges              |
| Scaffolded | Code structure exists, partial implementation |
| Planned    | Not yet implemented                           |

---

## 1. Chat & Messaging

| #     | Feature                        | Status | Description                                                                                          |
| ----- | ------------------------------ | ------ | ---------------------------------------------------------------------------------------------------- |
| F-001 | Thread Management              | GA     | Create, list, update, delete chat threads with per-thread settings                                   |
| F-002 | Message Sending                | GA     | Send messages, receive AI responses with full routing pipeline                                       |
| F-003 | Real-Time SSE Streaming        | GA     | Server-Sent Events for live response delivery                                                        |
| F-004 | Model Selector                 | GA     | Grouped dropdown: AUTO + provider groups with all synced models                                      |
| F-005 | File Attachments               | GA     | Attach up to 10 uploaded files per message for AI analysis                                           |
| F-006 | Context Pack Attachment        | GA     | Attach up to 10 curated knowledge packs per thread                                                   |
| F-007 | System Prompt                  | GA     | Custom system prompt per thread (max 10,000 chars)                                                   |
| F-008 | Temperature & Max Tokens       | GA     | Per-thread creativity (0-2) and response length (1-32,000)                                           |
| F-009 | Regenerate Response            | GA     | Re-execute routing and generation for any assistant message                                          |
| F-010 | Message Feedback               | GA     | Thumbs up/down on individual AI responses                                                            |
| F-011 | Routing Transparency           | GA     | Expandable badge showing confidence, reason tags, privacy/cost class                                 |
| F-012 | Thinking Indicator             | GA     | Visual indicator while polling for AI response (3-min max)                                           |
| F-013 | Parallel Multi-Model Compare   | GA     | Send one prompt to 2-5 models simultaneously, view side-by-side responses                            |
| F-014 | Auto Re-Routing on Weak Answer | GA     | Detects weak responses (short, repetitive, refusal) and re-routes to fallback provider automatically |

### User Stories

- **F-001**: "As a user, I want to create themed threads with custom routing so each conversation is optimized for its purpose."
- **F-002**: "As a developer, I want to send a coding question and get routed to Claude Sonnet automatically."
- **F-003**: "As a user, I want to see the AI response appear without refreshing the page."
- **F-004**: "As a user, I want to browse all available models grouped by provider and pick the best one."
- **F-005**: "As an analyst, I want to attach a CSV file and ask questions about its contents."
- **F-006**: "As a developer, I want to attach my project's coding standards so the AI follows them."
- **F-009**: "As a user, I want to regenerate a poor response to get a better answer."
- **F-010**: "As a user, I want to rate responses so the platform can track quality over time."
- **F-011**: "As a privacy-conscious user, I want to verify each message was processed locally."
- **F-013**: "As a power user, I want to send the same prompt to Claude, GPT, and Gemini simultaneously and compare their responses side by side."
- **F-014**: "As a user, I want the system to automatically try a better model when the first one gives a weak or broken response, without me having to click Regenerate."

---

## 2. Intelligent Routing

| #     | Feature                   | Status | Description                                                                            |
| ----- | ------------------------- | ------ | -------------------------------------------------------------------------------------- |
| F-020 | AUTO Routing Mode         | GA     | Ollama-powered task classification with Zod-validated output                           |
| F-021 | 7 Routing Modes           | GA     | AUTO, MANUAL_MODEL, LOCAL_ONLY, PRIVACY_FIRST, LOW_LATENCY, HIGH_REASONING, COST_SAVER |
| F-022 | Heuristic Fallback        | GA     | Deterministic keyword-based routing when Ollama times out (10s)                        |
| F-023 | Category-Aware Routing    | GA     | 64 keywords across coding (28), reasoning (21), thinking (15)                          |
| F-024 | Dynamic Prompt Building   | GA     | Router prompt built from installed models, cached 5 min                                |
| F-025 | Routing Policies          | GA     | Admin-defined rules with priority, conditions, and overrides                           |
| F-026 | Route Evaluation          | GA     | Test routing decisions without sending actual messages                                 |
| F-027 | Decision History          | GA     | Paginated routing decision audit trail per thread                                      |
| F-028 | Image Intent Detection    | GA     | 90+ keywords for image generation routing                                              |
| F-029 | File Generation Detection | GA     | Regex-based verb + format detection for file export routing                            |
| F-030 | Fallback Chain            | GA     | Primary -> fallback -> local Ollama -> error                                           |
| F-031 | Provider Health Check     | GA     | Only routes to healthy, active connectors                                              |
| F-032 | Routing Replay Lab        | GA     | Re-run historical routing decisions against the current router and compare old vs new  |

### User Stories

- **F-020**: "As a user, I want the system to automatically pick Claude for coding and Gemini for data analysis."
- **F-025**: "As an admin, I want to create a policy that forces all financial queries to LOCAL_ONLY."
- **F-026**: "As an admin, I want to test what routing decision would be made for 'debug this Python function' without sending a message."
- **F-032**: "As an admin, I want to replay last week's routing decisions against the current router to measure improvement after adding new models."

---

## 3. Memory System

| #     | Feature                      | Status | Description                                                                 |
| ----- | ---------------------------- | ------ | --------------------------------------------------------------------------- |
| F-040 | Automatic Memory Extraction  | GA     | Ollama extracts FACT/PREFERENCE/INSTRUCTION/SUMMARY from completed messages |
| F-041 | Memory CRUD                  | GA     | List, create, update, enable/disable, delete user-scoped memories           |
| F-042 | Memory Deduplication         | GA     | Semantic dedup check before storing new memories                            |
| F-043 | Context Assembly Integration | GA     | Memories included in every prompt (limit 20, enabled only)                  |
| F-044 | Context Packs                | GA     | Curated collections of text items and file references                       |
| F-045 | Context Pack CRUD            | GA     | Create, list, update, delete packs with ordered items                       |
| F-046 | Memory Type Filtering        | GA     | Filter by FACT, PREFERENCE, INSTRUCTION, SUMMARY                            |

### User Stories

- **F-040**: "As a user, I want the system to remember that I prefer TypeScript so it uses it in code examples without being told."
- **F-044**: "As a developer, I want to create a 'Project Architecture' context pack with key decisions."
- **F-041**: "As a privacy-conscious user, I want to disable memories containing sensitive information."

---

## 4. Model Catalog & Management

| #     | Feature               | Status | Description                                                    |
| ----- | --------------------- | ------ | -------------------------------------------------------------- |
| F-060 | Model Catalog Browse  | GA     | 30 models across 6 categories with search and filters          |
| F-061 | Model Download        | GA     | Pull models from catalog with real-time SSE progress           |
| F-062 | Download Management   | GA     | List active downloads, cancel in-progress pulls                |
| F-063 | Role Assignment       | GA     | Assign models to 7 roles (ROUTER, LOCAL_CODING, etc.)          |
| F-064 | Installed Models List | GA     | View all locally installed models with metadata                |
| F-065 | Auto-Pull on Startup  | GA     | Configurable via AUTO_PULL_MODELS env var                      |
| F-066 | Runtime Configuration | GA     | View/manage Ollama, vLLM, llama.cpp, LocalAI, ComfyUI runtimes |

### User Stories

- **F-060**: "As a developer, I want to browse coding models sorted by size so I can pick one that fits my GPU."
- **F-061**: "As an admin, I want to download DeepSeek R1 32B and see real-time progress."
- **F-063**: "As an admin, I want to assign Qwen 2.5 Coder as the LOCAL_CODING model."

---

## 5. Connectors (Cloud Providers)

| #     | Feature            | Status | Description                                     |
| ----- | ------------------ | ------ | ----------------------------------------------- |
| F-080 | Connector CRUD     | GA     | Add, edit, delete cloud provider connections    |
| F-081 | Connection Testing | GA     | Validate API key with a lightweight test call   |
| F-082 | Model Sync         | GA     | Discover available models from provider API     |
| F-083 | Health Monitoring  | GA     | Periodic health checks with status tracking     |
| F-084 | API Key Encryption | GA     | AES-256-GCM encryption at rest                  |
| F-085 | 5 Provider Support | GA     | OpenAI, Anthropic, Google Gemini, DeepSeek, xAI |

### User Stories

- **F-080**: "As an admin, I want to add my Anthropic API key so the team can use Claude."
- **F-082**: "As an admin, I want to sync models so new Claude releases appear automatically."

---

## 6. File Management

| #     | Feature                | Status | Description                                                |
| ----- | ---------------------- | ------ | ---------------------------------------------------------- |
| F-100 | File Upload            | GA     | Upload JSON, CSV, Markdown, plain text files               |
| F-101 | File Chunking          | GA     | Automatic chunking for context injection                   |
| F-102 | File List              | GA     | Paginated list with filename, size, type, ingestion status |
| F-103 | File Context Injection | GA     | Chunks included in prompt during context assembly          |

### User Stories

- **F-100**: "As an analyst, I want to upload a 2MB CSV file for AI-assisted analysis."
- **F-101**: "As a user, I want uploaded files automatically chunked so the AI can reference them."

---

## 7. Image Generation

| #     | Feature                  | Status | Description                                                    |
| ----- | ------------------------ | ------ | -------------------------------------------------------------- |
| F-120 | Multi-Provider Image Gen | GA     | DALL-E 3, Gemini 2.5 Flash Image, Stable Diffusion (local)     |
| F-121 | Image Intent Routing     | GA     | AUTO mode detects image requests and routes to image providers |
| F-122 | Reference Image Support  | GA     | Generate variations based on attached reference images         |
| F-123 | Image Generation History | GA     | View all past generations with prompts and results             |
| F-124 | Retry & Alternate        | GA     | Retry with same provider or try a different image model        |

### User Stories

- **F-120**: "As a user, I want to say 'generate a logo for my app' and get an image."
- **F-122**: "As a designer, I want to upload a reference image and generate variations."

---

## 8. File Generation

| #     | Feature              | Status | Description                                                      |
| ----- | -------------------- | ------ | ---------------------------------------------------------------- |
| F-140 | 7 Format Export      | Beta   | PDF, DOCX, CSV, HTML, Markdown, TXT, JSON                        |
| F-141 | Two-Phase Generation | Beta   | Phase 1: LLM generates content; Phase 2: format adapter converts |
| F-142 | File Download        | Beta   | Download generated files via API                                 |
| F-143 | Intent Detection     | GA     | Routing detects "create a PDF", "export as CSV" etc.             |

### User Stories

- **F-140**: "As an analyst, I want to say 'generate a CSV report of the analysis' and download the file."
- **F-141**: "As a user, I want to export my conversation summary as a PDF document."

---

## 9. Authentication & Authorization

| #     | Feature                 | Status | Description                                           |
| ----- | ----------------------- | ------ | ----------------------------------------------------- |
| F-160 | JWT Authentication      | GA     | Short-lived access tokens with refresh token rotation |
| F-161 | RBAC (3 Roles)          | GA     | ADMIN, OPERATOR, VIEWER with per-endpoint enforcement |
| F-162 | Session Management      | GA     | Tracked sessions with IP, user agent, revocation      |
| F-163 | Argon2 Password Hashing | GA     | Memory-hard hashing resistant to GPU attacks          |
| F-164 | User Management         | GA     | Admin CRUD for user accounts, roles, status           |

---

## 10. Audit & Observability

| #     | Feature             | Status | Description                                           |
| ----- | ------------------- | ------ | ----------------------------------------------------- |
| F-180 | Audit Logging       | GA     | 10 event types, immutable append-only logs in MongoDB |
| F-181 | Usage Ledger        | GA     | Token consumption tracking by provider, model, user   |
| F-182 | Health Dashboard    | GA     | Aggregated health from all 13 services                |
| F-183 | Server Logs         | GA     | Centralized backend logs with 30-day TTL              |
| F-184 | Client Logs         | GA     | Frontend log ingestion with 30-day TTL                |
| F-185 | Request Correlation | GA     | X-Request-ID from frontend through all services       |

---

## 11. Settings & Preferences

| #     | Feature            | Status | Description                                                    |
| ----- | ------------------ | ------ | -------------------------------------------------------------- |
| F-200 | Theme Toggle       | GA     | Light/dark mode via CSS variables, system preference detection |
| F-201 | Language Selection | GA     | 8 languages: EN, AR, DE, ES, FR, IT, PT, RU                    |
| F-202 | RTL Support        | GA     | Full right-to-left layout for Arabic                           |
| F-203 | Password Change    | GA     | Authenticated password update                                  |
| F-204 | User Preferences   | GA     | Stored in User record, applied at login                        |

---

## 12. Infrastructure Features

| #     | Feature                   | Status | Description                                        |
| ----- | ------------------------- | ------ | -------------------------------------------------- |
| F-220 | Docker Compose Deployment | GA     | Single-command startup for ~22 containers          |
| F-221 | Nginx Reverse Proxy       | GA     | 20+ route mappings with SSE support                |
| F-222 | Hot Reload Development    | GA     | Node --watch for source, auto-migration for Prisma |
| F-223 | Pre-Commit Quality Gates  | GA     | Prettier + ESLint + TypeScript + Build + Test      |
| F-224 | CI/CD Pipeline            | GA     | GitHub Actions: lint -> typecheck -> test -> build |

---

## Feature Count Summary

| Category              | GA     | Beta  | Scaffolded | Planned | Total  |
| --------------------- | ------ | ----- | ---------- | ------- | ------ |
| Chat & Messaging      | 13     | 0     | 0          | 0       | 13     |
| Intelligent Routing   | 13     | 0     | 0          | 0       | 13     |
| Memory System         | 7      | 0     | 0          | 0       | 7      |
| Model Catalog         | 7      | 0     | 0          | 0       | 7      |
| Connectors            | 6      | 0     | 0          | 0       | 6      |
| File Management       | 4      | 0     | 0          | 0       | 4      |
| Image Generation      | 5      | 0     | 0          | 0       | 5      |
| File Generation       | 1      | 3     | 0          | 0       | 4      |
| Auth & Authz          | 5      | 0     | 0          | 0       | 5      |
| Audit & Observability | 6      | 0     | 0          | 0       | 6      |
| Settings              | 5      | 0     | 0          | 0       | 5      |
| Infrastructure        | 5      | 0     | 0          | 0       | 5      |
| **Total**             | **77** | **3** | **0**      | **0**   | **80** |
