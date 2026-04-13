# Test Data and Seed Strategy

## Purpose

This document defines the test data fixtures, seed scripts, and data strategies used across ClawAI. Every test environment must be reproducible from scratch using these seeds and fixtures. No test should depend on manually created data. No fixture should use trivial placeholder data -- all fixtures must exercise realistic scenarios and edge cases.

---

## Fixture Design Philosophy

1. **Realistic.** Fixtures use plausible data that mirrors real usage. Names, emails, and content look real, not like "test123" or "foo bar."
2. **Edge-case aware.** Every fixture set includes boundary values: empty strings, maximum lengths, special characters, Unicode, RTL text.
3. **Role-diverse.** Fixtures cover all three RBAC roles (ADMIN, OPERATOR, VIEWER) so permission boundaries are tested.
4. **State-diverse.** Fixtures include entities in every possible state (active, inactive, error, expired, processing, completed).
5. **Deterministic.** Running the seed script twice produces the same result. Seeds are idempotent (upsert, not insert).
6. **Isolated per service.** Each service's seed populates only its own database. Cross-service references use well-known IDs that are consistent across seeds.

---

## User Fixtures (Auth Service -- PostgreSQL `claw_auth`)

### Standard Users

| Email            | Username | Password     | Role     | Purpose                                             |
| ---------------- | -------- | ------------ | -------- | --------------------------------------------------- |
| admin@claw.ai    | admin    | Admin123!    | ADMIN    | Full access, manages users and system settings      |
| operator@claw.ai | operator | Operator123! | OPERATOR | Standard user, creates threads, manages connectors  |
| viewer@claw.ai   | viewer   | Viewer123!   | VIEWER   | Read-only access, cannot create or modify resources |

### Boundary Users

| Email                                                  | Username                                          | Role     | Purpose                                      |
| ------------------------------------------------------ | ------------------------------------------------- | -------- | -------------------------------------------- |
| max.username.length.boundary.test.user.account@claw.ai | abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklm | OPERATOR | Maximum username length boundary             |
| short@c.ai                                             | ab                                                | VIEWER   | Minimum username length boundary             |
| special+chars.underscore_dot@claw.ai                   | special_user.name                                 | OPERATOR | Special characters in email                  |
| unicode.user@claw.ai                                   | user_with_unicode                                 | OPERATOR | Tests Unicode handling in profiles           |
| arabic.user@claw.ai                                    | مستخدم_عربي                                       | OPERATOR | RTL username for Arabic locale testing       |
| disabled.user@claw.ai                                  | disabled_user                                     | OPERATOR | Status: DISABLED -- tests blocked login flow |

### Seed Script

```bash
cd apps/claw-auth-service && npx prisma db seed
```

**Location:** `apps/claw-auth-service/prisma/seed.ts`

**Behavior:**

- Upserts all users by email (idempotent).
- Passwords hashed with argon2.
- Creates default system settings if not present.
- Does not delete existing data.

---

## Chat Fixtures (Chat Service -- PostgreSQL `claw_chat`)

### Thread Fixtures

| Thread Title            | Owner            | Messages                     | Purpose                                                                                                             |
| ----------------------- | ---------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Empty Thread            | operator@claw.ai | 0                            | Tests empty state rendering                                                                                         |
| Single Message Thread   | operator@claw.ai | 1 (USER only)                | Tests single-message display, pending AI response state                                                             |
| Standard Conversation   | operator@claw.ai | 6 (3 USER + 3 ASSISTANT)     | Tests normal conversation flow                                                                                      |
| Long Conversation       | operator@claw.ai | 120 (60 USER + 60 ASSISTANT) | Tests pagination, scroll behavior, token budget truncation                                                          |
| Thread with Attachments | operator@claw.ai | 4                            | Messages reference file IDs from file service fixtures                                                              |
| Parallel Compare Thread | operator@claw.ai | 5                            | Contains parallel compare results from 3 models                                                                     |
| Pinned Thread           | operator@claw.ai | 3                            | Tests pinned thread display and sorting                                                                             |
| Archived Thread         | operator@claw.ai | 10                           | Tests archived thread filtering                                                                                     |
| Error Thread            | operator@claw.ai | 3                            | Last message is ASSISTANT with `metadata: { error: true }`                                                          |
| Multi-User Thread       | admin@claw.ai    | 8                            | Tests user isolation -- operator should not see this                                                                |
| All Routing Modes       | operator@claw.ai | 7                            | One thread per routing mode: AUTO, MANUAL_MODEL, LOCAL_ONLY, PRIVACY_FIRST, LOW_LATENCY, HIGH_REASONING, COST_SAVER |

### Message Fixtures (per thread)

Each message fixture includes:

| Field        | Example Value                                               |
| ------------ | ----------------------------------------------------------- |
| role         | USER or ASSISTANT                                           |
| content      | Realistic conversational text (not "test message")          |
| provider     | "local-ollama", "anthropic", "openai", "gemini", "deepseek" |
| model        | "gemma3:4b", "claude-sonnet-4", "gpt-4o-mini"               |
| routingMode  | Matches thread's routing mode                               |
| inputTokens  | Realistic count (50-2000)                                   |
| outputTokens | Realistic count (100-4000)                                  |
| latencyMs    | Realistic latency (200-15000)                               |
| feedback     | Mix of null, POSITIVE, NEGATIVE                             |
| metadata     | JSON with routing transparency data                         |

### Seed Script

```bash
cd apps/claw-chat-service && npx prisma db seed
```

**Location:** `apps/claw-chat-service/prisma/seed.ts`

---

## Connector Fixtures (Connector Service -- PostgreSQL `claw_connectors`)

### Connector Fixtures

| Name                 | Provider  | Status   | Purpose                                          |
| -------------------- | --------- | -------- | ------------------------------------------------ |
| Gemini Production    | GEMINI    | ACTIVE   | Primary cloud connector, has models synced       |
| OpenAI Testing       | OPENAI    | ACTIVE   | Secondary connector for parallel compare         |
| Anthropic Premium    | ANTHROPIC | ACTIVE   | High-reasoning connector                         |
| DeepSeek Budget      | DEEPSEEK  | ACTIVE   | Cost-saver connector                             |
| Local Ollama         | OLLAMA    | ACTIVE   | Local runtime connector, always present          |
| Deprecated Connector | OPENAI    | INACTIVE | Tests inactive connector filtering and display   |
| Broken Connector     | GEMINI    | ERROR    | Has invalid API key, tests error state rendering |

### ConnectorModel Fixtures (per connector)

For each active connector, seed 3-5 models:

| Connector         | Models                                             |
| ----------------- | -------------------------------------------------- |
| Gemini Production | gemini-2.5-flash, gemini-2.5-pro, gemini-2.0-flash |
| OpenAI Testing    | gpt-4o, gpt-4o-mini, gpt-4-turbo                   |
| Anthropic Premium | claude-opus-4, claude-sonnet-4, claude-haiku-3.5   |
| DeepSeek Budget   | deepseek-chat, deepseek-reasoner                   |
| Local Ollama      | gemma3:4b (auto-synced from ollama-service)        |

Each model fixture includes capability flags: `supportsStreaming`, `supportsTools`, `supportsVision`, `supportsAudio`.

### ConnectorHealthEvent Fixtures

- 5 recent healthy events for each active connector.
- 3 unhealthy events for the broken connector (with error messages).

### Seed Script

```bash
cd apps/claw-connector-service && npx prisma db seed
```

**Location:** `apps/claw-connector-service/prisma/seed.ts`

**Important:** Connector configs contain encrypted API keys. The seed uses the `ENCRYPTION_KEY` from `.env` to encrypt placeholder keys. These are not real API keys -- they are test values that will fail if used against real providers.

---

## Routing Fixtures (Routing Service -- PostgreSQL `claw_routing`)

### Routing Policy Fixtures

| Name                  | Routing Mode   | Priority | Active | Purpose                                                  |
| --------------------- | -------------- | -------- | ------ | -------------------------------------------------------- |
| Privacy First Default | PRIVACY_FIRST  | 100      | true   | Routes private data to local models                      |
| Cost Saver Default    | COST_SAVER     | 90       | true   | Prefers local, falls back to cheapest cloud              |
| Auto Default          | AUTO           | 80       | true   | Default 5-stage routing pipeline                         |
| Low Latency Override  | LOW_LATENCY    | 70       | true   | Forces fast models for time-sensitive queries            |
| Disabled Policy       | HIGH_REASONING | 50       | false  | Tests inactive policy filtering                          |
| Conflicting Policy    | AUTO           | 80       | true   | Same priority as Auto Default, tests conflict resolution |

### Routing Decision Fixtures (for replay testing)

Seed 50 historical routing decisions with diverse characteristics:

| Batch              | Count | Routing Mode | Characteristics                                 |
| ------------------ | ----- | ------------ | ----------------------------------------------- |
| Privacy decisions  | 10    | AUTO         | All routed to local (privacy keywords detected) |
| Cloud decisions    | 10    | AUTO         | Routed to various cloud providers               |
| Coding decisions   | 10    | AUTO         | Routed to coding-specialized models             |
| Manual decisions   | 10    | MANUAL_MODEL | User-selected provider/model                    |
| Fallback decisions | 10    | AUTO         | Primary failed, fallback used                   |

Each decision includes: `selectedProvider`, `selectedModel`, `confidence`, `reasonTags[]`, `privacyClass`, `costClass`, `fallbackProvider`, `fallbackModel`, `latencyMs`.

### Seed Script

```bash
cd apps/claw-routing-service && npx prisma db seed
```

**Location:** `apps/claw-routing-service/prisma/seed.ts`

---

## Ollama Model Fixtures (Ollama Service -- PostgreSQL `claw_ollama`)

### LocalModel Fixtures

| Name          | Tag    | Role                        | Size  | Status                       |
| ------------- | ------ | --------------------------- | ----- | ---------------------------- |
| gemma3        | 4b     | ROUTER, LOCAL_FALLBACK_CHAT | 3.3GB | Installed (pulled)           |
| qwen3         | 1.7b   | ROUTER                      | 1.1GB | Installed (pulled)           |
| phi4-mini     | latest | ROUTER                      | 2.2GB | Installed (pulled)           |
| qwen2.5-coder | 7b     | LOCAL_CODING                | 4.7GB | Not installed (catalog only) |
| deepseek-r1   | 7b     | LOCAL_REASONING             | 4.7GB | Not installed (catalog only) |

### Catalog Fixtures

The model catalog is seeded separately with 30 models across 6 categories:

```bash
cd apps/claw-ollama-service && npx tsx prisma/seed-catalog.ts
```

**Location:** `apps/claw-ollama-service/prisma/seed-catalog.ts`

This seed is idempotent and populates the full catalog as defined in CLAUDE.md (Coding, File Generation, Image Generation, Routing, Reasoning, Thinking categories).

### PullJob Fixtures

| Model             | Status      | Progress | Purpose                             |
| ----------------- | ----------- | -------- | ----------------------------------- |
| qwen2.5-coder:32b | IN_PROGRESS | 45%      | Tests active download display       |
| deepseek-r1:14b   | COMPLETED   | 100%     | Tests completed download history    |
| starcoder2:7b     | FAILED      | 12%      | Tests failed download error display |
| llama3.3:8b       | CANCELLED   | 67%      | Tests cancelled download display    |

### Seed Script

```bash
cd apps/claw-ollama-service && npx prisma db seed
```

**Location:** `apps/claw-ollama-service/prisma/seed.ts`

---

## File Fixtures (File Service -- PostgreSQL `claw_files`)

### File Fixtures

| Filename                     | MIME Type        | Size  | Chunks | Purpose                                |
| ---------------------------- | ---------------- | ----- | ------ | -------------------------------------- |
| report.pdf                   | application/pdf  | 245KB | 12     | Standard PDF, tests PDF chunking       |
| photo.png                    | image/png        | 1.2MB | 0      | Image file, tests non-chunkable file   |
| avatar.jpeg                  | image/jpeg       | 89KB  | 0      | Small image                            |
| data.csv                     | text/csv         | 45KB  | 8      | CSV file, tests tabular chunking       |
| config.json                  | application/json | 12KB  | 3      | JSON file, tests structured chunking   |
| notes.md                     | text/markdown    | 8KB   | 4      | Markdown file, tests text chunking     |
| readme.txt                   | text/plain       | 2KB   | 1      | Plain text file                        |
| large-dataset.csv            | text/csv         | 9.8MB | 150    | Large file, tests pagination of chunks |
| empty.txt                    | text/plain       | 0B    | 0      | Empty file, tests zero-size edge case  |
| file_with_chunks_pending.pdf | application/pdf  | 500KB | 0      | ingestionStatus: PROCESSING            |
| failed_ingestion.pdf         | application/pdf  | 300KB | 0      | ingestionStatus: FAILED                |

### Security Test Files (not seeded in DB, used for upload testing)

These files are stored in `apps/claw-file-service/test/fixtures/` for use in security tests:

| Filename                              | Purpose                     |
| ------------------------------------- | --------------------------- |
| `../../../etc/passwd`                 | Path traversal in filename  |
| `malware.exe.pdf`                     | Double extension attack     |
| `script.bat`                          | Dangerous extension         |
| `null\x00byte.pdf`                    | Null byte in filename       |
| `eicar-test.txt`                      | EICAR antivirus test string |
| `normal.pdf` (with wrong magic bytes) | MIME type mismatch          |

### Seed Script

```bash
cd apps/claw-file-service && npx prisma db seed
```

**Location:** `apps/claw-file-service/prisma/seed.ts`

**Note:** The seed creates database records and dummy chunk content. It does not create actual files on disk. For integration tests that need real files, use the test fixtures directory.

---

## Memory Fixtures (Memory Service -- PostgreSQL `claw_memory`)

### MemoryRecord Fixtures

| Type        | Content                                                    | User     | Enabled | Purpose                         |
| ----------- | ---------------------------------------------------------- | -------- | ------- | ------------------------------- |
| FACT        | "User works at Acme Corp as a senior engineer"             | operator | true    | Standard fact memory            |
| FACT        | "User prefers TypeScript over JavaScript"                  | operator | true    | Technical preference fact       |
| PREFERENCE  | "User likes concise responses, no fluff"                   | operator | true    | Communication style preference  |
| PREFERENCE  | "User prefers dark mode and monospace fonts"               | operator | true    | UI preference                   |
| INSTRUCTION | "Always include code examples in responses"                | operator | true    | Standing instruction            |
| INSTRUCTION | "Never suggest Python solutions, only TypeScript"          | operator | true    | Negative instruction            |
| SUMMARY     | "Previous conversation about setting up Docker Compose..." | operator | true    | Conversation summary            |
| FACT        | "Disabled memory for testing"                              | operator | false   | Tests disabled memory filtering |
| FACT        | "Admin's private memory"                                   | admin    | true    | Tests user isolation            |

### ContextPack Fixtures

| Name              | Description                                   | Scope  | Items    | Purpose                     |
| ----------------- | --------------------------------------------- | ------ | -------- | --------------------------- |
| TypeScript Expert | Instructions for TypeScript coding assistance | USER   | 5 items  | Standard context pack       |
| Empty Pack        | A pack with no items                          | USER   | 0 items  | Tests empty state           |
| Large Pack        | Pack with many items for truncation testing   | USER   | 25 items | Tests token budget handling |
| System Pack       | Global context available to all users         | SYSTEM | 3 items  | Tests system-scope packs    |

### ContextPackItem Types

Each pack contains items of mixed types:

- Text instructions (type: TEXT, content: string).
- File references (type: FILE, fileId: references file service fixture).
- Memory references (type: MEMORY, content: extracted from memory records).

### Seed Script

```bash
cd apps/claw-memory-service && npx prisma db seed
```

**Location:** `apps/claw-memory-service/prisma/seed.ts`

---

## Audit Fixtures (Audit Service -- MongoDB)

### AuditLog Fixtures

Seed 30 audit log entries covering all 10 event types:

| Action                | Count | Entity Type     | Severity |
| --------------------- | ----- | --------------- | -------- |
| message.completed     | 8     | ChatMessage     | INFO     |
| user.login            | 4     | User            | INFO     |
| user.logout           | 2     | User            | INFO     |
| connector.created     | 3     | Connector       | INFO     |
| connector.updated     | 2     | Connector       | INFO     |
| connector.deleted     | 1     | Connector       | WARN     |
| connector.synced      | 3     | Connector       | INFO     |
| routing.decision_made | 4     | RoutingDecision | INFO     |
| memory.extracted      | 2     | MemoryRecord    | INFO     |
| image.generated       | 1     | Image           | INFO     |

### UsageLedger Fixtures

Seed 20 usage entries:

| Resource Type    | Action   | Quantity | Unit   |
| ---------------- | -------- | -------- | ------ |
| LLM_TOKENS       | INPUT    | 15000    | tokens |
| LLM_TOKENS       | OUTPUT   | 8500     | tokens |
| FILE_STORAGE     | UPLOAD   | 12.5     | MB     |
| IMAGE_GENERATION | GENERATE | 3        | images |
| MODEL_DOWNLOAD   | PULL     | 2        | models |

### Seed Script

```bash
cd apps/claw-audit-service && npx prisma db seed
```

**Location:** `apps/claw-audit-service/prisma/seed.ts` (uses Mongoose, not Prisma)

---

## Log Fixtures (Client Logs + Server Logs -- MongoDB)

### Client Log Fixtures

Seed 15 client log entries:

| Level | Component     | Action                | Purpose            |
| ----- | ------------- | --------------------- | ------------------ |
| INFO  | ChatPage      | message_sent          | Normal user action |
| INFO  | ModelCatalog  | model_downloaded      | Normal user action |
| WARN  | AuthProvider  | token_refresh_failed  | Warning state      |
| ERROR | ChatPage      | sse_connection_failed | Error state        |
| ERROR | ConnectorForm | form_submit_failed    | Error state        |
| INFO  | Navigation    | page_view             | Telemetry event    |

### Server Log Fixtures

Seed 20 server log entries across multiple services:

| Level | Service           | Module           | Action               |
| ----- | ----------------- | ---------------- | -------------------- |
| INFO  | chat-service      | ChatService      | message_created      |
| INFO  | routing-service   | RoutingManager   | decision_made        |
| WARN  | connector-service | HealthManager    | health_check_timeout |
| ERROR | chat-service      | ExecutionManager | all_providers_failed |
| INFO  | ollama-service    | PullManager      | pull_completed       |
| ERROR | file-service      | SecurityManager  | antivirus_rejected   |

All log entries include `requestId`, `traceId`, and `timestamp` fields.

### Seed Scripts

```bash
cd apps/claw-client-logs-service && npx prisma db seed
cd apps/claw-server-logs-service && npx prisma db seed
```

---

## Image and File Generation Fixtures

### Image Service (PostgreSQL `claw_images`)

| Prompt                              | Provider         | Status     | Purpose             |
| ----------------------------------- | ---------------- | ---------- | ------------------- |
| "A sunset over a mountain range"    | GEMINI           | COMPLETED  | Standard generation |
| "A portrait of a cat in watercolor" | STABLE_DIFFUSION | COMPLETED  | Local generation    |
| "A futuristic city skyline"         | GEMINI           | FAILED     | Error state         |
| "Processing image request"          | GEMINI           | PROCESSING | In-progress state   |

### File Generation Service (PostgreSQL `claw_file_generations`)

| Title                | Format | Status     | Purpose             |
| -------------------- | ------ | ---------- | ------------------- |
| "Quarterly Report"   | PDF    | COMPLETED  | Standard PDF export |
| "Data Export"        | CSV    | COMPLETED  | CSV export          |
| "Meeting Notes"      | DOCX   | COMPLETED  | DOCX export         |
| "API Documentation"  | MD     | COMPLETED  | Markdown export     |
| "Failed Generation"  | PDF    | FAILED     | Error state         |
| "Pending Generation" | HTML   | PROCESSING | In-progress state   |

---

## Negative Data Fixtures

These fixtures are designed to break things. They are used in validation tests, security tests, and boundary tests.

### Null and Empty Values

| Field       | Test Value          | Expected Behavior                     |
| ----------- | ------------------- | ------------------------------------- |
| username    | `null`              | Zod validation rejects                |
| username    | `""` (empty string) | Zod validation rejects (min length)   |
| email       | `"not-an-email"`    | Zod validation rejects (email format) |
| content     | `""`                | Zod validation rejects (min length)   |
| threadId    | `"not-a-uuid"`      | Zod validation rejects (uuid format)  |
| temperature | `2.5`               | Zod validation rejects (max 2.0)      |
| temperature | `-1`                | Zod validation rejects (min 0)        |
| maxTokens   | `0`                 | Zod validation rejects (min 1)        |
| maxTokens   | `1000000`           | Zod validation rejects (max limit)    |

### Oversized Payloads

| Field            | Test Value         | Max Allowed         | Expected              |
| ---------------- | ------------------ | ------------------- | --------------------- |
| message content  | 100,000 characters | Varies by DTO       | 400 Bad Request       |
| username         | 500 characters     | ~50 chars           | 400 Bad Request       |
| file upload      | 50MB               | 10MB (configurable) | 413 Payload Too Large |
| array of fileIds | 100 items          | `.max()` on array   | 400 Bad Request       |
| JSON body        | 10MB nested JSON   | Body parser limit   | 413 Payload Too Large |

### Unicode Edge Cases

| Test Value                                       | Purpose                     |
| ------------------------------------------------ | --------------------------- |
| `"مرحبا بالعالم"` (Arabic)                       | RTL text in LTR context     |
| `"你好世界"` (Chinese)                           | CJK characters              |
| `"🎉🔥💻"` (Emoji)                               | Emoji in text fields        |
| `"café résumé naïve"` (Accented)                 | Latin accented characters   |
| `"test\x00null"` (Null byte)                     | Null byte injection         |
| `"<script>alert('xss')</script>"`                | XSS attempt in text field   |
| `"'; DROP TABLE users; --"`                      | SQL injection attempt       |
| `"{{constructor.constructor('return this')()}}"` | Prototype pollution attempt |

### Stale and Corrupt Data

| Scenario                     | Setup                                              | Purpose                                  |
| ---------------------------- | -------------------------------------------------- | ---------------------------------------- |
| Expired JWT token            | Token with `exp` in the past                       | Tests 401 response and redirect to login |
| Expired refresh token        | Session with `expiresAt` in the past               | Tests refresh flow failure               |
| Orphaned message             | Message with `threadId` referencing deleted thread | Tests cascade behavior                   |
| Orphaned file chunk          | Chunk with `fileId` referencing deleted file       | Tests cleanup logic                      |
| Inconsistent connector state | Connector status: ACTIVE but config: null          | Tests validation on read                 |
| Duplicate memory             | Two memories with identical content for same user  | Tests deduplication logic                |
| Model with no role           | LocalModel without any role assignment             | Tests default behavior                   |

---

## Seed Execution Order

Because some fixtures reference IDs from other services, seeds must run in this order:

```
1. Auth service      (creates users -- other services reference userId)
2. File service      (creates files -- chat messages reference fileIds)
3. Ollama service    (creates models + catalog)
4. Connector service (creates connectors + models)
5. Memory service    (creates memories + context packs)
6. Routing service   (creates policies + decisions)
7. Chat service      (creates threads + messages, references files/models)
8. Audit service     (creates audit entries, references entities from above)
9. Client logs       (creates log entries)
10. Server logs      (creates log entries)
11. Image service    (creates image records)
12. File generation  (creates file generation records)
```

### Full Seed Command

```bash
# Run all seeds in order
cd apps/claw-auth-service && npx prisma db seed && cd ../..
cd apps/claw-file-service && npx prisma db seed && cd ../..
cd apps/claw-ollama-service && npx prisma db seed && cd ../..
cd apps/claw-ollama-service && npx tsx prisma/seed-catalog.ts && cd ../..
cd apps/claw-connector-service && npx prisma db seed && cd ../..
cd apps/claw-memory-service && npx prisma db seed && cd ../..
cd apps/claw-routing-service && npx prisma db seed && cd ../..
cd apps/claw-chat-service && npx prisma db seed && cd ../..
cd apps/claw-audit-service && npx prisma db seed && cd ../..
cd apps/claw-client-logs-service && npx prisma db seed && cd ../..
cd apps/claw-server-logs-service && npx prisma db seed && cd ../..
cd apps/claw-image-service && npx prisma db seed && cd ../..
cd apps/claw-file-generation-service && npx prisma db seed && cd ../..
```

### Reset and Re-Seed

To start from a clean state:

```bash
# Reset all databases (WARNING: destroys all data)
cd apps/claw-auth-service && npx prisma migrate reset --force && cd ../..
cd apps/claw-chat-service && npx prisma migrate reset --force && cd ../..
# ... repeat for all Prisma services

# Then run the full seed command above
```

---

## Well-Known IDs

To enable cross-service references in fixtures, the following IDs are consistent across all seeds. These are UUIDs that are hardcoded in seed files.

| Entity           | Well-Known ID                          | Used By                                          |
| ---------------- | -------------------------------------- | ------------------------------------------------ |
| Admin user       | `00000000-0000-0000-0000-000000000001` | All services (userId in audit, ownership checks) |
| Operator user    | `00000000-0000-0000-0000-000000000002` | Chat threads, files, memories                    |
| Viewer user      | `00000000-0000-0000-0000-000000000003` | Read-only access tests                           |
| Standard thread  | `00000000-0000-0000-0000-000000000010` | Chat messages, audit references                  |
| Test file (PDF)  | `00000000-0000-0000-0000-000000000020` | Chat attachments, context packs                  |
| Test file (CSV)  | `00000000-0000-0000-0000-000000000021` | Chat attachments                                 |
| Gemini connector | `00000000-0000-0000-0000-000000000030` | Routing decisions, health events                 |
| gemma3:4b model  | `00000000-0000-0000-0000-000000000040` | Role assignments, routing                        |

These IDs must never change. If a seed script is modified, these IDs must be preserved to avoid breaking cross-service references.
