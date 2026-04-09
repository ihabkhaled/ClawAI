# ClawAI Feature Inventory

This document catalogs every product feature in ClawAI, organized by domain. Each feature includes a description, user stories, acceptance criteria, and the backend services involved.

---

## 1. Chat

The core conversational interface. Users create threads, send messages, receive AI-generated responses, and manage conversation settings.

### 1.1 Thread Management

**Description:** Users can create, list, update, and delete chat threads. Each thread has its own routing mode, system prompt, temperature, max tokens, preferred provider/model, and attached context packs.

**Related Services:** claw-chat-service (port 4002)

**User Stories:**

- As a user, I want to create a new chat thread so I can start a conversation on a specific topic.
- As a user, I want to list all my threads sorted by recent activity so I can resume previous conversations.
- As a user, I want to rename a thread so I can organize my conversation history.
- As a user, I want to delete a thread so I can remove conversations I no longer need.
- As a user, I want to configure a thread's routing mode, system prompt, temperature, and max tokens so I can customize AI behavior per conversation.

**Acceptance Criteria:**

- Thread creation accepts optional title, routingMode, systemPrompt, temperature (0-2), maxTokens (1-32000), preferredProvider, preferredModel, and contextPackIds (max 10).
- Thread list is paginated, user-scoped (users only see their own threads), and includes message count.
- Thread update allows changing title, routingMode, systemPrompt, temperature, maxTokens, preferredProvider, preferredModel, and contextPackIds.
- Thread deletion soft-removes the thread and all associated messages.
- Accessing another user's thread returns 403 FORBIDDEN_THREAD_ACCESS.

### 1.2 Message Sending and AI Response

**Description:** Users send messages in a thread. The system routes the message to the best AI provider, assembles context (memories, context packs, file chunks, thread history), calls the provider, and returns the AI response.

**Related Services:** claw-chat-service (port 4002), claw-routing-service (port 4004), claw-memory-service (port 4005), claw-file-service (port 4006), claw-ollama-service (port 4008), claw-image-service

**User Stories:**

- As a user, I want to send a message and receive an AI response so I can get help with my tasks.
- As a user, I want the system to automatically select the best model for my query when using AUTO routing.
- As a user, I want to see which provider and model generated each response so I understand the routing decision.
- As a user, I want to override the routing mode per-message by specifying a provider and model directly.

**Acceptance Criteria:**

- Message creation requires threadId and content (1-100,000 characters). Optional: routingMode, provider, model, fileIds (max 10).
- The system publishes message.created, receives routing decision via message.routed, assembles context, calls the provider, stores the ASSISTANT message, and emits SSE completion.
- If the primary provider fails, the system attempts fallback providers (up to the full candidate list).
- If all providers fail, a BusinessException with code LLM_EXECUTION_FAILED is thrown.
- Token counts (input/output), latency, provider, and model are stored on each ASSISTANT message.

### 1.3 Real-Time Streaming (SSE)

**Description:** Clients subscribe to a Server-Sent Events endpoint per thread to receive real-time updates when AI responses are ready, errors occur, or processing status changes.

**Related Services:** claw-chat-service (port 4002)

**User Stories:**

- As a user, I want to see the AI response appear in real time without manually refreshing.
- As a user, I want to see an error message immediately if the AI generation fails.

**Acceptance Criteria:**

- SSE endpoint at GET /api/v1/chat-messages/stream/:threadId requires JWT authentication.
- Events are filtered by threadId so clients only receive updates for their thread.
- Each event is a JSON-encoded MessageEvent containing the event payload.
- The endpoint is excluded from rate limiting (@SkipThrottle) and request logging (@SkipLogging).

### 1.4 Model Selection

**Description:** Users can select the routing mode and optionally override provider/model per thread or per message. The ModelSelector component groups available models by provider with an AUTO option.

**Related Services:** claw-chat-service (port 4002), claw-routing-service (port 4004), claw-connector-service (port 4003)

**User Stories:**

- As a user, I want to see all available models grouped by provider so I can make an informed selection.
- As a user, I want to use AUTO mode so the system selects the optimal model for each query.
- As a user, I want to force a specific model for tasks where I know which model performs best.

**Acceptance Criteria:**

- The model selector displays models from all active connectors plus local Ollama models.
- AUTO mode is the default selection, shown prominently at the top.
- Selecting a specific model sets the thread's routing mode to MANUAL_MODEL with forcedProvider and forcedModel.
- The selected model persists per thread across messages.

### 1.5 File Attachments

**Description:** Users can attach previously uploaded files to individual messages. The system fetches file chunks and includes them in the context assembly sent to the AI provider.

**Related Services:** claw-chat-service (port 4002), claw-file-service (port 4006)

**User Stories:**

- As a user, I want to attach files to a message so the AI can analyze their contents.
- As a user, I want to attach multiple files (up to 10) to a single message.

**Acceptance Criteria:**

- Message creation accepts an optional fileIds array (max 10 UUIDs).
- The context assembly manager fetches file chunks from the file-service via HTTP.
- File content is included in the prompt after memories and context pack items.
- Only files owned by the current user can be attached.

### 1.6 Context Pack Attachment

**Description:** Users can attach context packs to a thread. All items in the attached packs are included in every message's context assembly.

**Related Services:** claw-chat-service (port 4002), claw-memory-service (port 4005)

**User Stories:**

- As a user, I want to attach context packs to a thread so every message benefits from that background knowledge.
- As a user, I want to attach up to 10 context packs per thread.

**Acceptance Criteria:**

- Thread creation and update accept contextPackIds array (max 10).
- Context assembly fetches all items from attached context packs via HTTP to memory-service.
- Context pack items are included in the prompt after memories and before file chunks.

### 1.7 System Prompt

**Description:** Users can set a custom system prompt per thread that is prepended to every message sent to the AI provider.

**Related Services:** claw-chat-service (port 4002)

**User Stories:**

- As a user, I want to set a system prompt like "You are a senior code reviewer" so the AI adopts a specific persona.

**Acceptance Criteria:**

- System prompt is an optional string, max 10,000 characters.
- The system prompt is placed at the beginning of the context, before memories, packs, and file chunks.
- Changing the system prompt takes effect on the next message in the thread.

### 1.8 Temperature and Max Tokens

**Description:** Users can configure the temperature (creativity) and max tokens (response length) per thread.

**Related Services:** claw-chat-service (port 4002)

**User Stories:**

- As a user, I want to set a low temperature for deterministic code generation.
- As a user, I want to increase max tokens for longer analysis responses.

**Acceptance Criteria:**

- Temperature range: 0.0 to 2.0 (float). Default: provider default.
- Max tokens range: 1 to 32,000 (integer). Default: provider default.
- Values are passed to the AI provider in the request body.

### 1.9 Regenerate

**Description:** Users can regenerate the AI response for a specific message. The system re-executes the routing and generation pipeline using the same input.

**Related Services:** claw-chat-service (port 4002)

**User Stories:**

- As a user, I want to regenerate a response if the AI answer was unsatisfactory.

**Acceptance Criteria:**

- POST /api/v1/chat-messages/:id/regenerate triggers a new AI generation for the given message.
- The original ASSISTANT message is replaced with the new response.
- The user must own the thread containing the message.

### 1.10 Feedback

**Description:** Users can provide thumbs-up or thumbs-down feedback on individual AI responses.

**Related Services:** claw-chat-service (port 4002)

**User Stories:**

- As a user, I want to rate AI responses so the system can track quality.

**Acceptance Criteria:**

- PATCH /api/v1/chat-messages/:id/feedback accepts a feedback value.
- Feedback is stored on the ChatMessage record.
- The user must own the thread containing the message.

---

## 2. Routing

Intelligent routing determines which AI provider and model should handle each message based on content analysis, user preferences, and organizational policies.

### 2.1 Routing Modes (7 Modes)

**Description:** Seven routing modes govern how messages are dispatched to AI providers.

**Related Services:** claw-routing-service (port 4004), claw-ollama-service (port 4008)

| Mode           | Behavior                                                                                                                                                                      |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AUTO           | Ollama router analyzes the message (temp=0, Zod-validated schema, 10s timeout) and selects the optimal provider/model. Falls back to heuristic routing on timeout or failure. |
| MANUAL_MODEL   | User selects a specific provider and model. No routing intelligence applied.                                                                                                  |
| LOCAL_ONLY     | Always routes to local-ollama/gemma3:4b. No data leaves the local infrastructure.                                                                                             |
| PRIVACY_FIRST  | Uses local models when healthy. Falls back to Anthropic (best privacy terms) only if local is unavailable.                                                                    |
| LOW_LATENCY    | Routes to OpenAI/gpt-4o-mini for fastest response times.                                                                                                                      |
| HIGH_REASONING | Routes to Anthropic/claude-opus-4 for deepest reasoning capability.                                                                                                           |
| COST_SAVER     | Uses local models when healthy. Falls back to the cheapest available cloud provider.                                                                                          |

**User Stories:**

- As a user, I want to select a routing mode per thread so my messages are handled according to my priorities.
- As a privacy-conscious user, I want LOCAL_ONLY mode to guarantee no data reaches cloud providers.
- As a cost-conscious user, I want COST_SAVER mode to minimize cloud API spending.

**Acceptance Criteria:**

- All 7 routing modes are available in the thread creation and update DTOs.
- AUTO mode uses the Ollama router model (default: gemma3:4b) with a 10-second timeout.
- If the Ollama router times out or fails, AUTO falls back to heuristic content analysis.
- Each routing decision is recorded with selectedProvider, selectedModel, confidence, reasonTags, privacyClass, and costClass.

### 2.2 Routing Policies

**Description:** Administrators create policies that can override or constrain routing decisions. Policies have a name, routing mode, priority (0-1000), and a JSON config object.

**Related Services:** claw-routing-service (port 4004)

**User Stories:**

- As an administrator, I want to create routing policies so I can enforce organizational standards.
- As an administrator, I want to set policy priorities so higher-priority policies take precedence.
- As an administrator, I want to deactivate policies without deleting them.

**Acceptance Criteria:**

- CRUD operations for policies: create, list (paginated), get by ID, update, delete.
- Policies require name (1-255 chars), routingMode, priority (0-1000), and config (JSON object).
- Active policies are evaluated in priority order during routing decisions.
- Policy list supports pagination with page and limit query parameters.

### 2.3 Route Evaluation

**Description:** A test endpoint that evaluates what routing decision would be made for a given input without actually sending a message.

**Related Services:** claw-routing-service (port 4004)

**User Stories:**

- As an administrator, I want to test routing logic with sample inputs so I can verify policies work as intended.

**Acceptance Criteria:**

- POST /api/v1/routing/evaluate accepts an EvaluateRouteDto and returns a RoutingDecisionResult.
- The result includes selectedProvider, selectedModel, confidence, reasonTags, and fallback details.
- No actual message is sent or stored.

### 2.4 Decision History

**Description:** View the history of routing decisions for a specific thread, showing how each message was routed.

**Related Services:** claw-routing-service (port 4004)

**User Stories:**

- As a user, I want to see routing decisions for my thread so I understand why specific models were chosen.
- As an administrator, I want to review routing decisions to validate policy effectiveness.

**Acceptance Criteria:**

- GET /api/v1/routing/decisions/:threadId returns paginated routing decisions.
- Each decision includes selectedProvider, selectedModel, confidence, reasonTags, privacyClass, costClass, and fallback information.

### 2.5 Routing Transparency (Frontend)

**Description:** An expandable component on each AI response message showing the routing decision details: confidence score, reason tags, privacy classification, and cost classification.

**Related Services:** Frontend component, claw-routing-service (port 4004)

**User Stories:**

- As a user, I want to see why a specific model was chosen for my message.
- As a privacy-conscious user, I want to verify that my message was processed locally.

**Acceptance Criteria:**

- Each ASSISTANT message bubble displays a routing transparency badge.
- Clicking the badge expands to show confidence, reason tags, privacy class, and cost class.
- Real-time fallback transparency is shown when a fallback provider was used.

---

## 3. Memory

Automatic and manual memory management. The system extracts key information from conversations and persists it for use in future contexts.

### 3.1 Automatic Memory Extraction

**Description:** After each message.completed event, the memory service uses an Ollama model (default: gemma3:4b) to extract facts, preferences, instructions, and summaries from the conversation.

**Related Services:** claw-memory-service (port 4005), claw-ollama-service (port 4008)

**User Stories:**

- As a user, I want the system to automatically remember important facts and preferences from my conversations.
- As a user, I want extracted memories to be deduplicated so I don't accumulate redundant entries.

**Acceptance Criteria:**

- Memory extraction is triggered by the message.completed RabbitMQ event.
- Extraction uses the configured MEMORY_EXTRACTION_MODEL (default: gemma3:4b).
- Four memory types are supported: FACT, PREFERENCE, INSTRUCTION, SUMMARY.
- Deduplication check runs before persisting a new memory.
- Extracted memories are user-scoped (each user has their own memory store).

### 3.2 Memory CRUD

**Description:** Users can manually create, view, update, and delete memory records.

**Related Services:** claw-memory-service (port 4005)

**User Stories:**

- As a user, I want to create a memory manually so I can teach the AI specific information.
- As a user, I want to view all my memories filtered by type so I can review what the AI knows about me.
- As a user, I want to edit a memory to correct inaccurate extractions.
- As a user, I want to delete a memory to remove information I no longer want the AI to use.

**Acceptance Criteria:**

- Create memory requires type (FACT/PREFERENCE/INSTRUCTION/SUMMARY) and content (1-50,000 chars). Optional: sourceThreadId, sourceMessageId.
- List memories is paginated, user-scoped, and supports filtering by type and search.
- Update memory allows changing type, content, and isEnabled.
- Delete memory permanently removes the record.
- Accessing another user's memory returns 403 FORBIDDEN_MEMORY_ACCESS.

### 3.3 Memory Toggle

**Description:** Users can enable or disable individual memory records without deleting them. Disabled memories are excluded from context assembly.

**Related Services:** claw-memory-service (port 4005)

**User Stories:**

- As a user, I want to disable a memory temporarily so it is not included in my conversations.
- As a user, I want to re-enable a previously disabled memory.

**Acceptance Criteria:**

- PATCH /api/v1/memories/:id/toggle flips the isEnabled flag.
- Disabled memories are excluded from context assembly but remain in the list view.
- Toggle returns the updated memory record.

---

## 4. Connectors

Integration with external AI providers. Each connector represents a configured connection to a cloud AI service.

### 4.1 Connector CRUD

**Description:** Administrators create, configure, update, and delete connectors for AI providers (OpenAI, Anthropic, Gemini, DeepSeek, local Ollama).

**Related Services:** claw-connector-service (port 4003)

**User Stories:**

- As an administrator, I want to add a new AI provider connector so my team can use that provider's models.
- As an administrator, I want to update a connector's API key when it is rotated.
- As an administrator, I want to remove a connector that is no longer needed.

**Acceptance Criteria:**

- Create connector requires name (1-100 chars), provider (ConnectorProvider enum), and authType (ConnectorAuthType enum). Optional: apiKey (max 500 chars, AES-256-GCM encrypted), baseUrl, region.
- List connectors is paginated with filtering support.
- Update allows changing name, authType, apiKey, baseUrl, and region.
- Delete removes the connector and all associated models.
- Connector responses include associated models (ConnectorWithModels).

### 4.2 Test Connection

**Description:** Verify that a connector's API key and configuration are valid by making a test request to the provider.

**Related Services:** claw-connector-service (port 4003)

**User Stories:**

- As an administrator, I want to test a connector to verify the API key works before relying on it.

**Acceptance Criteria:**

- POST /api/v1/connectors/:id/test returns a HealthCheckResult.
- The test makes an actual API call to the provider to validate credentials.
- Results include success/failure status and any error details.

### 4.3 Sync Models

**Description:** Fetch the list of available models from a provider and sync them into the local database.

**Related Services:** claw-connector-service (port 4003)

**User Stories:**

- As an administrator, I want to sync models from a provider to see all available models and their capabilities.

**Acceptance Criteria:**

- POST /api/v1/connectors/:id/sync fetches models from the provider API and upserts them into the ConnectorModel table.
- Each model includes modelKey, displayName, lifecycle, and capability flags (streaming, tools, vision, audio).
- Returns a SyncModelsResult with the count of added, updated, and removed models.
- Publishes a connector.synced event to RabbitMQ.

### 4.4 Health Monitoring

**Description:** Automatic and on-demand health checks for connector endpoints.

**Related Services:** claw-connector-service (port 4003), claw-health-service (port 4009)

**User Stories:**

- As an administrator, I want to monitor connector health so I can detect outages quickly.

**Acceptance Criteria:**

- Health check results are stored as ConnectorHealthEvent records.
- The health service aggregates connector health into the overall system health endpoint.
- Publishes connector.health_checked events to RabbitMQ.

---

## 5. Files

Upload, store, chunk, and analyze files for use in AI conversations.

### 5.1 File Upload

**Description:** Users upload files (JSON, CSV, Markdown, plain text) for use in chat conversations. Files are stored on disk with metadata in PostgreSQL.

**Related Services:** claw-file-service (port 4006)

**User Stories:**

- As a user, I want to upload a file so the AI can analyze its contents.
- As a user, I want to see upload progress and ingestion status.

**Acceptance Criteria:**

- POST /api/v1/files/upload accepts filename, mimeType, sizeBytes, and storagePath (base64 or path).
- Allowed MIME types are validated; invalid types return INVALID_MIME_TYPE error.
- File size is validated; oversized files return FILE_TOO_LARGE error (max 50MB).
- File metadata is stored in the File table with ingestionStatus tracking.

### 5.2 File Chunking

**Description:** After upload, files are automatically chunked into manageable segments for context assembly. Chunking strategies vary by file type (JSON, CSV, Markdown, plain text).

**Related Services:** claw-file-service (port 4006)

**User Stories:**

- As a user, I want uploaded files to be automatically processed so the AI can reference specific sections.

**Acceptance Criteria:**

- Chunking is triggered automatically after successful upload.
- Each chunk is stored as a FileChunk record with chunkIndex and content.
- Chunking strategy is determined by MIME type.
- File ingestionStatus is updated throughout the process.
- Publishes file.chunked event on completion.

### 5.3 File Listing and Retrieval

**Description:** Users can list their uploaded files and view file details.

**Related Services:** claw-file-service (port 4006)

**User Stories:**

- As a user, I want to list all my uploaded files so I can select which ones to attach to messages.
- As a user, I want to view file details including ingestion status.

**Acceptance Criteria:**

- GET /api/v1/files returns paginated, user-scoped file list.
- GET /api/v1/files/:id returns a single file's metadata.
- GET /api/v1/files/:id/chunks returns all chunks for a file.
- Accessing another user's file returns 403 FORBIDDEN_FILE_ACCESS.

### 5.4 File Download

**Description:** Users can download previously uploaded files.

**Related Services:** claw-file-service (port 4006)

**User Stories:**

- As a user, I want to download a file I previously uploaded.

**Acceptance Criteria:**

- GET /api/v1/files/download/:id streams the file content with appropriate Content-Type headers.
- Only the file owner can download.

### 5.5 File Deletion

**Description:** Users can delete uploaded files.

**Related Services:** claw-file-service (port 4006)

**User Stories:**

- As a user, I want to delete files I no longer need.

**Acceptance Criteria:**

- DELETE /api/v1/files/:id removes the file metadata, chunks, and stored file.
- Only the file owner can delete.

---

## 6. Context Packs

Curated collections of reference material that can be attached to chat threads to provide persistent background context.

### 6.1 Context Pack CRUD

**Description:** Users create, list, update, and delete context packs. Each pack has a name, description, and scope.

**Related Services:** claw-memory-service (port 4005)

**User Stories:**

- As a user, I want to create a context pack to organize related reference materials.
- As a user, I want to list my context packs so I can choose which to attach to a thread.
- As a user, I want to rename or update a context pack's description.
- As a user, I want to delete a context pack I no longer need.

**Acceptance Criteria:**

- Create context pack requires a name. Optional: description, scope.
- List context packs is paginated, user-scoped, with optional search filter.
- Update allows changing name, description, and scope.
- Delete removes the pack and all its items.
- Accessing another user's context pack returns 403 FORBIDDEN_CONTEXT_PACK_ACCESS.

### 6.2 Context Pack Items

**Description:** Add and remove items within a context pack. Items can be text content or file references with a sort order.

**Related Services:** claw-memory-service (port 4005)

**User Stories:**

- As a user, I want to add text items to a context pack (e.g., coding standards, business definitions).
- As a user, I want to add file references to a context pack so file content is included in every message.
- As a user, I want to remove items from a context pack.

**Acceptance Criteria:**

- POST /api/v1/context-packs/:id/items adds an item with type, content, optional fileId, and sortOrder.
- DELETE /api/v1/context-packs/:id/items/:itemId removes an item.
- GET /api/v1/context-packs/:id returns the pack with all items (ContextPackWithItems).
- Items are included in context assembly in sortOrder sequence.

---

## 7. Image Generation

AI-powered image generation from text prompts, supporting multiple providers and retry mechanisms.

### 7.1 Image Generation (via Chat)

**Description:** When the AUTO router detects an image generation request, or when the user selects an image-capable model, the system routes to the image service. Images are generated asynchronously with SSE progress updates.

**Related Services:** claw-image-service, claw-chat-service (port 4002)

**User Stories:**

- As a user, I want to describe an image and have the AI generate it.
- As a user, I want to see generation progress in real time.

**Acceptance Criteria:**

- Image generation is triggered through the chat message flow when routed to an image provider.
- The internal API accepts prompt, provider, model, userId, optional width/height/quality/style.
- Width and height range: 256-4096 pixels.
- Generation status is streamed via SSE at GET /api/v1/images/:id/events.
- The generated image is linked to the ASSISTANT message.

### 7.2 Image List and Retrieval

**Description:** Users can list their generated images and view details of specific generations.

**Related Services:** claw-image-service

**User Stories:**

- As a user, I want to see a history of all images I have generated.
- As a user, I want to view details of a specific image generation including prompt, provider, and status.

**Acceptance Criteria:**

- GET /api/v1/images returns paginated, user-scoped image generation list.
- GET /api/v1/images/:id returns a single generation's details.

### 7.3 Retry

**Description:** Users can retry a failed image generation with the same parameters.

**Related Services:** claw-image-service

**User Stories:**

- As a user, I want to retry a failed image generation without re-entering the prompt.

**Acceptance Criteria:**

- POST /api/v1/images/:id/retry creates a new generation attempt with the original parameters.
- Returns the new generation ID and status.

### 7.4 Retry with Alternate Provider

**Description:** Users can retry image generation with a different provider or model.

**Related Services:** claw-image-service

**User Stories:**

- As a user, I want to try a different image model if the first result was unsatisfactory.

**Acceptance Criteria:**

- POST /api/v1/images/:id/retry-alternate accepts optional provider and model overrides.
- If no alternate model is available, returns NO_ALTERNATE_MODEL error.
- Returns the new generation ID, status, provider, and model.

---

## 8. File Generation

AI-powered document generation from prompts, supporting multiple output formats.

### 8.1 File Generation (via Chat)

**Description:** When the system detects a file generation request, it routes to the file generation service. Documents are generated asynchronously with SSE progress updates.

**Related Services:** claw-file-generation-service, claw-chat-service (port 4002)

**User Stories:**

- As a user, I want to ask the AI to generate a document and receive a downloadable file.
- As a user, I want to specify the output format for generated files.

**Acceptance Criteria:**

- The internal API accepts prompt, content (up to 10MB), format (max 10 chars), provider, model, userId.
- Optional: threadId, userMessageId, assistantMessageId, filename.
- Generation status is streamed via SSE at GET /api/v1/file-generations/:id/events.

### 8.2 File Generation List and Retrieval

**Description:** Users can list their generated files and view details.

**Related Services:** claw-file-generation-service

**User Stories:**

- As a user, I want to see a history of all files I have generated.

**Acceptance Criteria:**

- GET /api/v1/file-generations returns paginated, user-scoped list.
- GET /api/v1/file-generations/:id returns generation details.

### 8.3 File Generation Retry

**Description:** Users can retry a failed file generation.

**Related Services:** claw-file-generation-service

**User Stories:**

- As a user, I want to retry a failed file generation without re-entering the prompt.

**Acceptance Criteria:**

- POST /api/v1/file-generations/:id/retry creates a new generation attempt.
- Returns the new generation ID and status.

---

## 9. Audit and Usage

Comprehensive audit logging and usage tracking across the platform.

### 9.1 Audit Event Logging

**Description:** Ten audit event types are captured automatically via RabbitMQ consumers. Every significant action (login, message completion, connector change, routing decision) is logged.

**Related Services:** claw-audit-service (port 4007)

**Event Types:** user.login, user.logout, message.completed, connector.created, connector.updated, connector.deleted, connector.synced, connector.health_checked, routing.decision_made, memory.extracted

**User Stories:**

- As an administrator, I want to see a chronological log of all platform activities.
- As an administrator, I want to filter audit logs by action, severity, entity type, and date range.

**Acceptance Criteria:**

- GET /api/v1/audits returns paginated audit logs with filters: action, severity, entityType, startDate, endDate, search.
- Each log includes userId, action, entityType, entityId, severity, and details (JSON).
- Audit data is stored in MongoDB with automatic indexing.

### 9.2 Audit Statistics

**Description:** Aggregated statistics about audit events.

**Related Services:** claw-audit-service (port 4007)

**User Stories:**

- As an administrator, I want to see a summary of audit activity (counts by action, severity trends).

**Acceptance Criteria:**

- GET /api/v1/audits/stats returns an AuditStatsResponse with aggregated counts.

### 9.3 Usage Tracking

**Description:** Tracks resource consumption: API calls, token counts, costs per provider/model.

**Related Services:** claw-audit-service (port 4007)

**User Stories:**

- As an administrator, I want to see detailed usage entries for each AI interaction.
- As an administrator, I want to filter usage by provider, model, and date range.

**Acceptance Criteria:**

- GET /api/v1/usage returns paginated usage ledger entries.
- Filters: provider, model, startDate, endDate.
- Each entry includes resourceType, action, quantity, unit, and metadata.

### 9.4 Usage Summary

**Description:** Aggregated usage statistics.

**Related Services:** claw-audit-service (port 4007)

**User Stories:**

- As an administrator, I want a summary view of total usage across all providers.

**Acceptance Criteria:**

- GET /api/v1/usage/summary returns a UsageSummaryResponse.

### 9.5 Cost Summary

**Description:** Aggregated cost breakdown by provider and model.

**Related Services:** claw-audit-service (port 4007)

**User Stories:**

- As an administrator, I want to see how much each provider costs so I can optimize routing policies.

**Acceptance Criteria:**

- GET /api/v1/usage/cost returns a CostSummaryResult with cost breakdowns.

### 9.6 Latency Summary

**Description:** Aggregated latency statistics by provider and model.

**Related Services:** claw-audit-service (port 4007)

**User Stories:**

- As an administrator, I want to see average latency per provider to optimize for speed.

**Acceptance Criteria:**

- GET /api/v1/usage/latency returns a LatencySummaryResult with latency percentiles.

---

## 10. Observability

System health monitoring and log management.

### 10.1 Health Dashboard

**Description:** Aggregated health status across all 11 backend services, Ollama runtime, and external connectors.

**Related Services:** claw-health-service (port 4009), all services

**User Stories:**

- As an administrator, I want a single dashboard showing the health of every service.
- As an administrator, I want to quickly identify which service is degraded.

**Acceptance Criteria:**

- GET /api/v1/health returns aggregated health from all services.
- Each service reports its own health via its /health endpoint.
- The health service polls all services and aggregates results.

### 10.2 Client Logs

**Description:** Frontend application logs sent to the backend for centralized storage. Supports batching and TTL-based cleanup (30 days).

**Related Services:** claw-client-logs-service (port 4010)

**User Stories:**

- As a developer, I want frontend errors to be captured centrally so I can debug issues.
- As an administrator, I want to search client logs by level, component, and date range.

**Acceptance Criteria:**

- POST /api/v1/client-logs accepts log entries (public endpoint, no JWT required).
- GET /api/v1/client-logs returns paginated, searchable logs (ADMIN/OPERATOR only).
- GET /api/v1/client-logs/stats returns aggregated log statistics (ADMIN/OPERATOR only).
- Logs have a 30-day TTL in MongoDB.

### 10.3 Server Logs

**Description:** Backend service logs stored centrally. All services publish structured logs via RabbitMQ.

**Related Services:** claw-server-logs-service (port 4011)

**User Stories:**

- As an administrator, I want to search server logs across all services from a single interface.
- As an administrator, I want to filter logs by service, module, level, request ID, and trace ID.

**Acceptance Criteria:**

- POST /api/v1/server-logs and POST /api/v1/server-logs/batch accept log entries (public endpoints for inter-service use).
- GET /api/v1/server-logs returns paginated logs with filters: level, serviceName, module, controller, action, requestId, traceId, userId, threadId, provider, search, startDate, endDate.
- GET /api/v1/server-logs/stats returns aggregated statistics.
- Logs have a 30-day TTL in MongoDB.

---

## 11. Admin

Administrative functions for platform management.

### 11.1 User Management

**Description:** Administrators create, update, deactivate, reactivate, and change roles for user accounts.

**Related Services:** claw-auth-service (port 4001)

**User Stories:**

- As an administrator, I want to create new user accounts with specific roles.
- As an administrator, I want to deactivate users who leave the organization.
- As an administrator, I want to reactivate previously deactivated users.
- As an administrator, I want to change a user's role (e.g., promote VIEWER to OPERATOR).

**Acceptance Criteria:**

- POST /api/v1/users creates a user (ADMIN only). Duplicate email returns DUPLICATE_ENTITY.
- GET /api/v1/users returns paginated user list (ADMIN only).
- PATCH /api/v1/users/:id updates user details (ADMIN only).
- DELETE /api/v1/users/:id deactivates a user (ADMIN only). Cannot deactivate self.
- PATCH /api/v1/users/:id/reactivate restores a deactivated user (ADMIN only).
- PATCH /api/v1/users/:id/role changes a user's role (ADMIN only). Cannot change own role.

### 11.2 System Settings

**Description:** Key/value store for system-wide configuration managed by administrators.

**Related Services:** claw-auth-service (port 4001)

**User Stories:**

- As an administrator, I want to configure system-wide settings without editing environment variables.

**Acceptance Criteria:**

- System settings are stored in the SystemSetting table (key/value pairs).
- Only ADMIN users can modify system settings.

---

## 12. Settings

User-facing preferences and account management.

### 12.1 Language Preference

**Description:** Users select their preferred UI language from 8 supported languages.

**Related Services:** claw-auth-service (port 4001), Frontend i18n

**Supported Languages:** English (EN), Arabic (AR), German (DE), Spanish (ES), French (FR), Italian (IT), Portuguese (PT), Russian (RU)

**User Stories:**

- As a user, I want to change the UI language to my preferred language.
- As an Arabic-speaking user, I want the UI to render in right-to-left (RTL) mode.

**Acceptance Criteria:**

- PATCH /api/v1/users/me/preferences accepts languagePreference.
- The frontend applies the selected language immediately via i18n.
- Arabic language selection enables RTL layout.

### 12.2 Appearance Preference

**Description:** Users select their preferred theme (light, dark, or system-detected).

**Related Services:** claw-auth-service (port 4001), Frontend

**User Stories:**

- As a user, I want to switch between light and dark mode.
- As a user, I want the app to follow my system preference by default.

**Acceptance Criteria:**

- PATCH /api/v1/users/me/preferences accepts appearancePreference.
- Theme is applied via CSS variables; no dark: prefixes.

### 12.3 Password Change

**Description:** Users can change their own password.

**Related Services:** claw-auth-service (port 4001)

**User Stories:**

- As a user, I want to change my password for security.

**Acceptance Criteria:**

- PATCH /api/v1/users/me/password requires current password and new password.
- Incorrect current password returns INVALID_CURRENT_PASSWORD.
- New password cannot be the same as the current password (SAME_PASSWORD_ERROR).
- Returns 204 No Content on success.

---

## 13. Authentication

JWT-based authentication with refresh token rotation.

### 13.1 Login

**Description:** Users authenticate with email and password to receive JWT access and refresh tokens.

**Related Services:** claw-auth-service (port 4001)

**Acceptance Criteria:**

- POST /api/v1/auth/login accepts email and password. Returns access token, refresh token, and user profile.
- Invalid credentials return 401 INVALID_CREDENTIALS.
- Suspended accounts return 403 ACCOUNT_SUSPENDED.
- Publishes user.login event.

### 13.2 Token Refresh

**Description:** Exchange a valid refresh token for a new token pair (rotation).

**Related Services:** claw-auth-service (port 4001)

**Acceptance Criteria:**

- POST /api/v1/auth/refresh accepts refreshToken. Returns new access and refresh tokens.
- The old refresh token is invalidated (rotation).
- Expired or invalid tokens return 401 INVALID_REFRESH_TOKEN.

### 13.3 Logout

**Description:** Invalidate all sessions for the current user.

**Related Services:** claw-auth-service (port 4001)

**Acceptance Criteria:**

- POST /api/v1/auth/logout invalidates all sessions for the authenticated user.
- Returns 204 No Content.
- Publishes user.logout event.

### 13.4 Profile

**Description:** Retrieve the authenticated user's profile.

**Related Services:** claw-auth-service (port 4001)

**Acceptance Criteria:**

- GET /api/v1/auth/me returns the current user's profile (id, email, username, role, preferences).

---

## 14. Local Ollama Models

Management of locally installed AI models via the Ollama runtime.

### 14.1 Model Listing

**Description:** List all local models with their installation status, size, family, and parameters.

**Related Services:** claw-ollama-service (port 4008)

**Acceptance Criteria:**

- GET /api/v1/ollama/models returns paginated model list with optional filters (runtime, isInstalled).
- Models are auto-synced from the Ollama runtime on service startup.

### 14.2 Model Pull

**Description:** Pull (download) a new model from the Ollama registry.

**Related Services:** claw-ollama-service (port 4008)

**Acceptance Criteria:**

- POST /api/v1/ollama/pull accepts model name and tag. Triggers the download.
- Pull progress is tracked via PullJob records.

### 14.3 Role Assignment

**Description:** Assign roles to local models (ROUTER, FALLBACK_CHAT, REASONING, CODING).

**Related Services:** claw-ollama-service (port 4008)

**Acceptance Criteria:**

- POST /api/v1/ollama/assign-role accepts modelId and role.
- Invalid model ID returns ENTITY_NOT_FOUND.
- Returns the created LocalModelRoleAssignment.

### 14.4 Generation

**Description:** Direct text generation via local Ollama models.

**Related Services:** claw-ollama-service (port 4008)

**Acceptance Criteria:**

- POST /api/v1/ollama/generate accepts prompt and model parameters. Returns generated text.
- This endpoint is public (used internally by routing and memory services).

### 14.5 Health Check

**Description:** Check the health of the Ollama runtime.

**Related Services:** claw-ollama-service (port 4008)

**Acceptance Criteria:**

- GET /api/v1/ollama/health?runtime=OLLAMA returns runtime health status.
- This endpoint is public (used by the health aggregator).

### 14.6 Runtime Configuration

**Description:** List available runtime configurations.

**Related Services:** claw-ollama-service (port 4008)

**Acceptance Criteria:**

- GET /api/v1/ollama/runtimes returns all RuntimeConfig records.
