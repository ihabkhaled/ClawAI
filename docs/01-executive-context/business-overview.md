# Business Overview

This document describes the business context, user personas, rules, workflows, and domain terminology for ClawAI. It is written for product owners, QA engineers, and new team members who need to understand the "why" and "what" before the "how."

---

## Business Problem

Organizations adopting AI face five interconnected problems:

1. **Fragmented access.** Teams use different AI providers (OpenAI, Anthropic, Google, etc.) through separate interfaces with no unified experience or governance.

2. **Data leakage risk.** Conversations containing proprietary code, customer data, or internal strategy are sent to cloud providers with no policy enforcement or visibility.

3. **Wasted spend.** Simple questions ("What time is it in Tokyo?") are routed to expensive frontier models that cost 10-100x more than a local model that could answer equally well.

4. **Lost context.** Institutional knowledge mentioned in AI conversations disappears after the session ends. The same facts are re-explained across dozens of threads.

5. **No accountability.** There is no record of what was asked, which model answered, what data was shared, or how much it cost.

ClawAI solves all five by providing a single orchestration layer with intelligent routing, local-first privacy, cross-conversation memory, and comprehensive auditing.

---

## Market Context

The AI tooling market in 2025-2026 is characterized by:

- **Model proliferation.** New models ship weekly. Organizations cannot evaluate and adopt each one individually.
- **Regulatory pressure.** GDPR, CCPA, and sector-specific regulations increasingly require demonstrable data governance for AI interactions.
- **Cost scrutiny.** After initial excitement, CFOs are asking for AI usage justification and cost optimization.
- **Local model viability.** Open-source models (Llama, Gemma, Phi) running on commodity hardware are now capable enough for many production tasks.
- **Vendor diversification.** Single-provider strategies create risk (outages, pricing changes, policy changes). Organizations want optionality.

ClawAI is positioned for organizations that recognize these trends and want a self-hosted, multi-provider, privacy-aware AI platform they control.

---

## User Personas

### Persona 1: IT Administrator (Admin role)

**Profile:** Manages the organization's technology infrastructure. Responsible for security, compliance, and operational efficiency.

**Goals:**

- Control which AI providers are connected and which models are available
- Enforce routing policies (e.g., "all financial data must stay local")
- Manage user accounts and role assignments
- Audit AI usage for compliance reporting
- Monitor system health and performance

**Pain points without ClawAI:**

- No visibility into which AI tools employees use
- Cannot enforce data handling policies across multiple AI providers
- No centralized audit trail for compliance
- Shadow AI usage across the organization

**Key workflows:**

- Connector management (add/remove/configure AI providers)
- User administration (create accounts, assign roles)
- Routing policy configuration (create rules for automatic routing)
- Audit log review and export
- Usage analytics review

---

### Persona 2: Software Developer (Operator role)

**Profile:** Writes code daily and uses AI for coding assistance, code review, debugging, and technical Q&A.

**Goals:**

- Fast, context-aware AI responses for coding tasks
- Attach code files and documentation as context
- Get the right model for the right task without manual selection
- Maintain conversation context across sessions

**Pain points without ClawAI:**

- Manually switching between Claude (coding), ChatGPT (general), and Gemini (multimodal)
- Re-explaining project context in every new conversation
- Accidentally sending proprietary code to the wrong provider
- No way to attach internal documentation to conversations

**Key workflows:**

- Chat with AUTO routing (system selects best model for coding vs. general vs. reasoning)
- File attachment (upload code files, get AI analysis)
- Context pack usage (attach project documentation to threads)
- Memory review (verify what the system remembers about their preferences)

---

### Persona 3: Data Analyst (Operator role)

**Profile:** Works with datasets, generates reports, and uses AI for data interpretation and visualization assistance.

**Goals:**

- Upload CSV/JSON datasets for AI-assisted analysis
- Generate documents and reports via AI
- Use multimodal models for chart and image analysis
- Track which analyses were performed for reproducibility

**Pain points without ClawAI:**

- File size limits on consumer AI chat apps
- No persistence of analytical context between sessions
- Cannot attach reference documents alongside datasets
- No audit trail of AI-assisted analyses

**Key workflows:**

- File upload and chunked analysis
- Chat with file context (ask questions about uploaded data)
- File generation (produce reports, summaries, formatted documents)
- Image generation (create charts, diagrams, visualizations)

---

### Persona 4: Privacy-Conscious User (any role)

**Profile:** Works with sensitive data (legal, medical, financial, HR) and requires guarantees about where data is processed.

**Goals:**

- Guarantee that sensitive conversations stay on local infrastructure
- Verify routing decisions after the fact
- Use AI assistance without compromising data governance

**Pain points without ClawAI:**

- No way to guarantee data stays local when using cloud AI
- No visibility into where data was actually processed
- Must choose between AI productivity and data compliance

**Key workflows:**

- Chat with PRIVACY_FIRST or LOCAL_ONLY routing mode
- Routing transparency review (verify which model processed each message)
- Audit log review (compliance evidence)

---

## Business Rules Catalog

### Authentication and Authorization

| #     | Rule                                                                                      | Enforcement                                                            |
| ----- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| BR-01 | Every API request must be authenticated (JWT) except login, refresh, and health endpoints | AuthGuard on all services, `@Public()` decorator for exceptions        |
| BR-02 | Users have exactly one role: ADMIN, OPERATOR, or VIEWER                                   | Role enum in database, validated at registration                       |
| BR-03 | Sessions expire after the configured JWT access token TTL (default 15 minutes)            | JWT expiry check in AuthGuard                                          |
| BR-04 | Refresh tokens rotate on every use (one-time use)                                         | Session table tracks current refresh token, old tokens are invalidated |
| BR-05 | Only ADMIN users can create, modify, or delete other user accounts                        | RolesGuard with `@Roles(Role.ADMIN)` on user management endpoints      |

### Chat and Messaging

| #     | Rule                                                                                           | Enforcement                                                       |
| ----- | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| BR-06 | Users can only access their own chat threads                                                   | User ID ownership check in chat-service                           |
| BR-07 | Every user message triggers a routing decision and an AI response                              | Event-driven flow: message.created -> message.routed -> execution |
| BR-08 | Message content is never modified after creation                                               | Immutable record in database, no update endpoints for content     |
| BR-09 | Feedback (thumbs up/down) can be given once per message                                        | Unique constraint on feedback per message                         |
| BR-10 | Thread settings (routing mode, temperature, model) apply to all future messages in that thread | Settings stored on ChatThread, read at execution time             |

### Routing

| #     | Rule                                                                                               | Enforcement                                                 |
| ----- | -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| BR-11 | AUTO mode uses Ollama router with a 10-second timeout; falls back to heuristic if timeout exceeded | Timeout configuration, fallback logic in routing-service    |
| BR-12 | PRIVACY_FIRST mode never sends data to cloud providers if local Ollama is healthy                  | Routing logic checks Ollama health before considering cloud |
| BR-13 | LOCAL_ONLY mode always uses local-ollama, even if it produces inferior results                     | Hard-coded provider selection, no fallback to cloud         |
| BR-14 | Routing policies are applied in priority order and can override the thread's routing mode          | Policies sorted by priority field, applied sequentially     |
| BR-15 | Every routing decision records confidence score, reason tags, privacy class, and cost class        | Mandatory fields on RoutingDecision entity                  |

### Memory

| #     | Rule                                                                     | Enforcement                                                         |
| ----- | ------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| BR-16 | Memory extraction happens asynchronously after message completion        | Triggered by message.completed event via RabbitMQ                   |
| BR-17 | Extracted memories are scoped to the user who created them               | userId field on MemoryRecord, filtered in all queries               |
| BR-18 | Users can disable individual memories without deleting them              | isEnabled boolean field on MemoryRecord                             |
| BR-19 | Memory deduplication prevents storing semantically identical facts       | Dedup check during extraction (Ollama-assisted comparison)          |
| BR-20 | Context packs are curated collections that can be attached to any thread | ContextPack entity with items, attached via thread.contextPackIds[] |

### Connectors

| #     | Rule                                                           | Enforcement                                                  |
| ----- | -------------------------------------------------------------- | ------------------------------------------------------------ |
| BR-21 | Connector API keys are encrypted at rest with AES-256-GCM      | encryptedConfig field, encryption in connector-service       |
| BR-22 | Connector health is checked periodically and status is updated | ConnectorHealthEvent records, status field on Connector      |
| BR-23 | Model sync discovers available models from each provider       | ModelSyncRun records, ConnectorModel table populated by sync |
| BR-24 | Only ADMIN users can create or modify connectors               | RolesGuard enforcement                                       |

### Files

| #     | Rule                                                  | Enforcement                                     |
| ----- | ----------------------------------------------------- | ----------------------------------------------- |
| BR-25 | Uploaded files are chunked for context assembly       | FileChunk records created during ingestion      |
| BR-26 | Supported file types: JSON, CSV, Markdown, plain text | MIME type validation in file-service            |
| BR-27 | Files are scoped to the user who uploaded them        | userId field, ownership check on all operations |

### Audit and Compliance

| #     | Rule                                                     | Enforcement                                                   |
| ----- | -------------------------------------------------------- | ------------------------------------------------------------- |
| BR-28 | Every significant action produces an audit log entry     | Event-driven: services publish events, audit-service consumes |
| BR-29 | Usage is tracked per resource type, action, and quantity | UsageLedger in MongoDB, updated by audit-service              |
| BR-30 | Audit logs are immutable (append-only)                   | MongoDB collection with no update/delete operations exposed   |
| BR-31 | Server and client logs have a 30-day TTL                 | MongoDB TTL index on createdAt field                          |

---

## Business Workflows

### Workflow 1: New User Onboarding

```
ADMIN creates user account (email, username, role)
  --> System hashes password with argon2
  --> System creates User record with role
  --> User receives credentials
  --> User logs in (POST /auth/login)
  --> System issues JWT access token + refresh token
  --> System creates Session record
  --> User accesses dashboard
```

### Workflow 2: First Conversation

```
User creates new chat thread (optional: select routing mode, model)
  --> Default: AUTO routing mode
User types first message
  --> Chat service creates USER message
  --> Routing service evaluates message
    --> AUTO: Ollama router classifies task, selects provider/model
    --> Other modes: apply mode-specific logic
  --> Chat service assembles context
    --> System prompt + memories + context packs + file chunks + history
  --> Chat service calls selected provider
    --> On failure: try fallback provider
    --> On failure: try local Ollama
  --> Store ASSISTANT message
  --> Stream response to user via SSE
  --> Memory service extracts facts/preferences asynchronously
  --> Audit service records the interaction
```

### Workflow 3: Connector Setup

```
ADMIN navigates to Connectors page
  --> Adds new connector (provider type, API key, base URL)
  --> System encrypts API key with AES-256-GCM
  --> System tests connection (validation call to provider)
  --> On success: connector status = ACTIVE
  --> System triggers model sync
    --> Discovers available models from provider
    --> Creates ConnectorModel records
  --> Models become available in routing decisions
```

### Workflow 4: Routing Policy Creation

```
ADMIN navigates to Routing page
  --> Creates new routing policy
    --> Name, routing mode, priority, configuration
    --> Example: "Privacy Policy" - priority 1 - if content contains PII, route LOCAL_ONLY
  --> Policy becomes active
  --> All future routing decisions apply policies in priority order
  --> Routing decisions record which policies influenced the outcome
```

### Workflow 5: Memory Management

```
Automatic extraction (background):
  Message completed --> memory-service receives event
  --> Ollama extracts facts/preferences/instructions from message
  --> Dedup check against existing memories
  --> Store new MemoryRecord entries

Manual management (user-initiated):
  User navigates to Memory page
  --> Views extracted memories (FACT, PREFERENCE, INSTRUCTION, SUMMARY)
  --> Can disable/enable individual memories
  --> Can delete memories
  --> Can create manual memory entries

Context pack management:
  User creates context pack (name, description)
  --> Adds items (text, file references)
  --> Attaches pack to chat thread
  --> Context assembly includes pack items in prompt
```

### Workflow 6: File Analysis

```
User uploads file (CSV, JSON, Markdown, text)
  --> File service stores file, creates metadata record
  --> Ingestion pipeline chunks file into FileChunk records
  --> User attaches file to chat thread
  --> Context assembly includes relevant file chunks in prompt
  --> User asks questions about the file
  --> AI responds with file-aware answers
```

### Workflow 7: Audit Review

```
ADMIN navigates to Audit page
  --> Views audit log timeline (filtered by date, user, action, severity)
  --> Each entry shows: who, what, when, on which entity, with what details
  --> Views usage dashboard
    --> Cost per provider
    --> Messages per routing mode
    --> Token usage over time
    --> Model distribution
```

---

## Business Glossary

| Term                         | Definition                                                                                                                                                                                |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Thread**                   | A conversation between a user and one or more AI models. Contains an ordered sequence of messages. Persists across sessions.                                                              |
| **Message**                  | A single exchange unit within a thread. Has a role (USER or ASSISTANT), content, and metadata (provider, model, tokens, latency).                                                         |
| **Routing Mode**             | The strategy used to select which AI provider and model handles a message. Seven modes available: AUTO, MANUAL_MODEL, LOCAL_ONLY, PRIVACY_FIRST, LOW_LATENCY, HIGH_REASONING, COST_SAVER. |
| **Routing Decision**         | The recorded outcome of the routing process for a specific message. Includes selected provider, model, confidence score, reason tags, privacy class, cost class, and fallback option.     |
| **Routing Policy**           | An administrator-defined rule that influences routing decisions. Policies have a priority and are evaluated in order.                                                                     |
| **Connector**                | A configured connection to an AI provider (OpenAI, Anthropic, Gemini, DeepSeek) or local runtime (Ollama). Stores encrypted credentials and available models.                             |
| **Provider**                 | An AI service that ClawAI can route messages to. Five supported: OpenAI, Anthropic, Google Gemini, DeepSeek, local-ollama.                                                                |
| **Model**                    | A specific AI model within a provider (e.g., gpt-4o within OpenAI, claude-sonnet-4 within Anthropic).                                                                                     |
| **Memory**                   | A fact, preference, instruction, or summary extracted from conversations and stored for reuse. Scoped to a single user.                                                                   |
| **Context Pack**             | A curated collection of text items and file references that can be attached to a thread to provide additional context.                                                                    |
| **Fallback**                 | The backup provider/model used when the primary routing selection fails (timeout, error, rate limit).                                                                                     |
| **Context Assembly**         | The process of building the full prompt sent to an AI provider. Combines: system prompt, memories, context pack items, file chunks, and thread history, all within a token budget.        |
| **Token**                    | The unit of text processing used by AI models. Both input (prompt) and output (response) tokens are counted and tracked. Directly correlates with cost.                                   |
| **Audit Log**                | An immutable record of a significant system event (login, message sent, connector created, routing decision made).                                                                        |
| **Usage Ledger**             | A running tally of resource consumption (tokens, API calls, storage) by provider, user, and time period.                                                                                  |
| **RBAC**                     | Role-Based Access Control. Three roles: ADMIN (full access), OPERATOR (standard usage), VIEWER (read-only).                                                                               |
| **Ollama**                   | An open-source local AI runtime that runs language models on the host machine. Used for routing, privacy-sensitive tasks, and as a fallback.                                              |
| **pgvector**                 | A PostgreSQL extension that enables vector similarity search. Used by the memory service for semantic deduplication and retrieval.                                                        |
| **DLQ (Dead Letter Queue)**  | A RabbitMQ queue where messages that fail processing after 3 retries are stored for manual inspection.                                                                                    |
| **SSE (Server-Sent Events)** | The protocol used to stream AI responses from the server to the frontend in real time.                                                                                                    |
| **Context Window**           | The maximum number of tokens a model can process in a single request. Context assembly respects this limit via token budget truncation.                                                   |
| **Ingestion**                | The process of uploading a file, parsing it, and splitting it into chunks for AI context assembly.                                                                                        |
| **Privacy Class**            | A classification on routing decisions indicating the data sensitivity level. Determines whether cloud routing is permitted.                                                               |
| **Cost Class**               | A classification on routing decisions indicating the expected cost tier (free/local, cheap, moderate, expensive).                                                                         |
| **Confidence Score**         | A 0-1 score on routing decisions indicating how certain the router is about its model selection.                                                                                          |
| **Reason Tags**              | Short labels on routing decisions explaining why a particular model was selected (e.g., "coding-task", "privacy-required", "low-complexity").                                             |
