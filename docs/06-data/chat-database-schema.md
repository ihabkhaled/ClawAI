# Chat Database Schema (claw_chat)

PostgreSQL database for the chat service (port 5442). Manages threads, messages, and attachments.

---

## Connection

```
Database: claw_chat
Port: 5442 (host) / 5432 (container)
URL: postgresql://claw:claw_secret@pg-chat:5432/claw_chat?schema=public
Prisma schema: apps/claw-chat-service/prisma/schema.prisma
```

---

## Tables

### chat_threads

Stores conversation threads.

| Column | Type | Nullable | Default | Constraints | Description |
|--------|------|----------|---------|-------------|-------------|
| id | String (CUID) | NO | `cuid()` | PK | Thread identifier |
| user_id | String | NO | - | - | Owning user ID (from auth service) |
| title | String | YES | - | - | Thread title (auto-generated or user-set) |
| routing_mode | RoutingMode enum | NO | `AUTO` | - | How messages are routed |
| last_provider | String | YES | - | - | Last used AI provider |
| last_model | String | YES | - | - | Last used AI model |
| is_pinned | Boolean | NO | `false` | - | Pinned to top of list |
| is_archived | Boolean | NO | `false` | - | Archived (hidden from main list) |
| preferred_provider | String | YES | - | - | User's preferred provider for this thread |
| preferred_model | String | YES | - | - | User's preferred model for this thread |
| context_pack_ids | String[] | NO | `[]` | - | Attached context pack IDs |
| system_prompt | String | YES | - | - | Custom system prompt |
| temperature | Float | YES | `0.7` | - | LLM temperature (0-2) |
| max_tokens | Int | YES | - | - | Max response tokens |
| created_at | DateTime | NO | `now()` | - | Creation timestamp |
| updated_at | DateTime | NO | auto | - | Last update timestamp |

**Indexes**:
- `user_id` — list threads by user
- `created_at` — sort threads by date

**Relations**:
- `messages` — one-to-many with ChatMessage (cascade delete)

### chat_messages

Stores individual messages within threads.

| Column | Type | Nullable | Default | Constraints | Description |
|--------|------|----------|---------|-------------|-------------|
| id | String (CUID) | NO | `cuid()` | PK | Message identifier |
| thread_id | String | NO | - | FK -> chat_threads.id | Parent thread |
| role | MessageRole enum | NO | - | - | SYSTEM, USER, ASSISTANT, TOOL |
| content | String | NO | - | - | Message text content |
| provider | String | YES | - | - | AI provider used (for ASSISTANT) |
| model | String | YES | - | - | AI model used (for ASSISTANT) |
| routing_mode | RoutingMode enum | YES | - | - | Routing mode used |
| router_model | String | YES | - | - | Model used for routing decision |
| used_fallback | Boolean | NO | `false` | - | Whether fallback was used |
| input_tokens | Int | YES | - | - | Input token count |
| output_tokens | Int | YES | - | - | Output token count |
| estimated_cost | Decimal(12,8) | YES | - | - | Estimated cost in USD |
| latency_ms | Int | YES | - | - | Response time in milliseconds |
| feedback | String | YES | - | - | User feedback (thumbs up/down) |
| metadata | Json | YES | - | - | Extra metadata (error flag, etc.) |
| created_at | DateTime | NO | `now()` | - | Message timestamp |

**Indexes**:
- `thread_id` — list messages in a thread
- `created_at` — sort messages chronologically

**Relations**:
- `thread` — many-to-one with ChatThread (cascade delete)
- `attachments` — one-to-many with MessageAttachment (cascade delete)

**Important**: Error messages from failed AI calls are stored as ASSISTANT role with `metadata: { error: true }`. This allows the frontend's polling to detect the completion.

### message_attachments

Links messages to uploaded files.

| Column | Type | Nullable | Default | Constraints | Description |
|--------|------|----------|---------|-------------|-------------|
| id | String (CUID) | NO | `cuid()` | PK | Attachment identifier |
| message_id | String | NO | - | FK -> chat_messages.id | Parent message |
| file_id | String | NO | - | - | File ID (from file service) |
| type | String | NO | - | - | Attachment type |

**Indexes**:
- `message_id` — find attachments for a message

**Cascade**: Deleting a ChatMessage deletes its attachments.

---

## Enums

### RoutingMode
```
AUTO           — Dynamic routing via Ollama + heuristics
MANUAL_MODEL   — User-selected provider + model
LOCAL_ONLY     — Category-aware local model selection
PRIVACY_FIRST  — Local if healthy, else Anthropic
LOW_LATENCY    — OpenAI gpt-4o-mini
HIGH_REASONING — Anthropic claude-opus-4
COST_SAVER     — Local if healthy, else cheapest cloud
```

### MessageRole
```
SYSTEM    — System prompt messages
USER      — User-sent messages
ASSISTANT — AI-generated responses
TOOL      — Tool call results
```

---

## Data Flow

1. User creates a thread (POST /chat-threads)
2. User sends message (POST /chat-messages) -> creates USER message
3. Routing decides provider/model (via RabbitMQ event)
4. AI response stored as ASSISTANT message with provider, model, tokens, latency
5. Thread updated with last_provider and last_model

---

## Cascade Delete Chain

```
ChatThread (delete)
  -> ChatMessage (cascade)
    -> MessageAttachment (cascade)
```

Deleting a thread removes all its messages and their attachments.
