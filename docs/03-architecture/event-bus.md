# Event Bus Architecture

## Overview

ClawAI uses RabbitMQ as its asynchronous event bus to decouple services and enable event-driven workflows. All inter-service events flow through a single topic exchange with routing-key-based filtering. The system includes dead-letter queues (DLQ) and retry mechanisms to ensure reliable message delivery.

---

## Exchange Topology

```
                         +---------------------------+
                         |   claw.events             |
                         |   (topic exchange,        |
                         |    durable)               |
                         +---------------------------+
                            |   |   |   |   |   |
          +-----------------+   |   |   |   |   +------------------+
          |                     |   |   |   |                      |
          v                     v   |   v   v                      v
  +---------------+  +----------+  |  +---------+  +------------+  +----------+
  | routing.queue |  | chat.q   |  |  | audit.q |  | memory.q   |  | srvlog.q |
  | bind:         |  | bind:    |  |  | bind:   |  | bind:      |  | bind:    |
  | message.      |  | message. |  |  | *.#     |  | message.   |  | log.     |
  | created       |  | routed   |  |  |         |  | completed  |  | server   |
  +-------+-------+  +----+-----+  |  +----+----+  +-----+------+  +----+-----+
          |                |        |       |              |              |
          v                v        |       v              v              v
  routing-service   chat-service    |  audit-service  memory-service  server-logs
                                    |
                                    v
                            +-------+--------+
                            | DLQ exchange   |
                            | claw.events.dlx|
                            | (direct)       |
                            +-------+--------+
                                    |
                                    v
                            +-------+--------+
                            | DLQ queues     |
                            | (per service)  |
                            +----------------+
```

---

## Event Catalog

### message.created

Published when a user sends a new chat message.

| Field                     | Type           | Description                              |
| ------------------------- | -------------- | ---------------------------------------- |
| `messageId`               | UUID           | The newly created message ID             |
| `threadId`                | UUID           | The thread this message belongs to       |
| `userId`                  | UUID           | The user who sent the message            |
| `content`                 | string         | The message text content                 |
| `forcedProvider`          | string or null | User-forced provider (MANUAL_MODEL mode) |
| `forcedModel`             | string or null | User-forced model                        |
| `fileIds`                 | UUID[]         | IDs of attached files                    |
| `contextPackIds`          | UUID[]         | IDs of attached context packs            |
| `threadRoutingMode`       | RoutingMode    | The thread's routing mode setting        |
| `threadPreferredProvider` | string or null | Thread's preferred provider              |
| `threadPreferredModel`    | string or null | Thread's preferred model                 |

**Publisher**: chat-service
**Consumers**: routing-service

---

### message.routed

Published when the routing engine has determined the optimal provider and model.

| Field              | Type           | Description                                         |
| ------------------ | -------------- | --------------------------------------------------- |
| `messageId`        | UUID           | The message being routed                            |
| `threadId`         | UUID           | The thread ID                                       |
| `selectedProvider` | string         | Chosen provider (e.g., "anthropic", "local-ollama") |
| `selectedModel`    | string         | Chosen model (e.g., "claude-sonnet-4")              |
| `confidence`       | float          | Routing confidence score (0.0 - 1.0)                |
| `reasonTags`       | string[]       | Why this selection was made                         |
| `privacyClass`     | PrivacyClass   | LOW, MEDIUM, or HIGH                                |
| `costClass`        | CostClass      | LOW, MEDIUM, or HIGH                                |
| `fallbackProvider` | string or null | Fallback if primary fails                           |
| `fallbackModel`    | string or null | Fallback model                                      |
| `heuristicUsed`    | boolean        | Whether Ollama router was bypassed                  |
| `decisionId`       | UUID           | The recorded routing decision ID                    |

**Publisher**: routing-service
**Consumers**: chat-service

---

### message.completed

Published when an AI response has been generated and stored.

| Field              | Type           | Description                          |
| ------------------ | -------------- | ------------------------------------ |
| `messageId`        | UUID           | The assistant message ID             |
| `threadId`         | UUID           | The thread ID                        |
| `userId`           | UUID           | The user who initiated the request   |
| `userContent`      | string         | The original user message            |
| `assistantContent` | string         | The AI response                      |
| `provider`         | string         | Actual provider used                 |
| `model`            | string         | Actual model used                    |
| `routingMode`      | RoutingMode    | Routing mode that was active         |
| `inputTokens`      | number         | Tokens in the prompt                 |
| `outputTokens`     | number         | Tokens in the response               |
| `latencyMs`        | number         | Total execution time                 |
| `fallbackUsed`     | boolean        | Whether a fallback provider was used |
| `fallbackProvider` | string or null | Which fallback was used, if any      |
| `fallbackModel`    | string or null | Which fallback model, if any         |

**Publisher**: chat-service
**Consumers**: memory-service, audit-service

---

### thread.created

Published when a new chat thread is created.

| Field         | Type        | Description             |
| ------------- | ----------- | ----------------------- |
| `threadId`    | UUID        | The new thread ID       |
| `userId`      | UUID        | The user who created it |
| `title`       | string      | Thread title            |
| `routingMode` | RoutingMode | Initial routing mode    |

**Publisher**: chat-service
**Consumers**: _(currently no consumers; reserved for future analytics)_

---

### user.login

Published when a user successfully authenticates.

| Field       | Type     | Description                |
| ----------- | -------- | -------------------------- |
| `userId`    | UUID     | The authenticated user     |
| `email`     | string   | User email                 |
| `role`      | UserRole | ADMIN, OPERATOR, or VIEWER |
| `sessionId` | UUID     | The new session ID         |
| `ipAddress` | string   | Client IP (for audit)      |
| `userAgent` | string   | Client user agent          |

**Publisher**: auth-service
**Consumers**: audit-service

---

### user.logout

Published when a user logs out or their session is invalidated.

| Field       | Type   | Description                       |
| ----------- | ------ | --------------------------------- |
| `userId`    | UUID   | The user who logged out           |
| `sessionId` | UUID   | The terminated session            |
| `reason`    | string | "manual", "expired", or "revoked" |

**Publisher**: auth-service
**Consumers**: audit-service

---

### connector.created

Published when a new cloud provider connector is configured.

| Field         | Type              | Description            |
| ------------- | ----------------- | ---------------------- |
| `connectorId` | UUID              | The new connector ID   |
| `name`        | string            | Connector display name |
| `provider`    | ConnectorProvider | Provider type          |
| `userId`      | UUID              | User who created it    |

**Publisher**: connector-service
**Consumers**: audit-service

---

### connector.updated

Published when a connector's configuration is modified.

| Field         | Type              | Description              |
| ------------- | ----------------- | ------------------------ |
| `connectorId` | UUID              | The updated connector ID |
| `name`        | string            | Connector display name   |
| `provider`    | ConnectorProvider | Provider type            |
| `changes`     | string[]          | List of changed fields   |
| `userId`      | UUID              | User who made the change |

**Publisher**: connector-service
**Consumers**: audit-service

---

### connector.deleted

Published when a connector is removed.

| Field         | Type              | Description              |
| ------------- | ----------------- | ------------------------ |
| `connectorId` | UUID              | The deleted connector ID |
| `provider`    | ConnectorProvider | Provider type            |
| `userId`      | UUID              | User who deleted it      |

**Publisher**: connector-service
**Consumers**: audit-service

---

### connector.synced

Published after a model sync operation completes for a connector.

| Field           | Type              | Description                   |
| --------------- | ----------------- | ----------------------------- |
| `connectorId`   | UUID              | The connector that was synced |
| `provider`      | ConnectorProvider | Provider type                 |
| `modelsAdded`   | number            | New models discovered         |
| `modelsRemoved` | number            | Models no longer available    |
| `modelsUpdated` | number            | Models with changed metadata  |
| `totalModels`   | number            | Total models after sync       |

**Publisher**: connector-service
**Consumers**: audit-service, routing-service

---

### connector.health_checked

Published after a connector health check completes.

| Field         | Type              | Description                           |
| ------------- | ----------------- | ------------------------------------- |
| `connectorId` | UUID              | The checked connector                 |
| `provider`    | ConnectorProvider | Provider type                         |
| `status`      | string            | "healthy", "degraded", or "unhealthy" |
| `latencyMs`   | number            | Health check response time            |
| `error`       | string or null    | Error message if unhealthy            |

**Publisher**: connector-service
**Consumers**: audit-service, routing-service

---

### routing.decision_made

Published after every routing decision for analytics.

| Field              | Type        | Description                         |
| ------------------ | ----------- | ----------------------------------- |
| `decisionId`       | UUID        | The routing decision ID             |
| `messageId`        | UUID        | The routed message                  |
| `routingMode`      | RoutingMode | Mode used                           |
| `selectedProvider` | string      | Chosen provider                     |
| `selectedModel`    | string      | Chosen model                        |
| `confidence`       | float       | Confidence score                    |
| `heuristicUsed`    | boolean     | Whether heuristic fallback was used |
| `latencyMs`        | number      | Decision computation time           |

**Publisher**: routing-service
**Consumers**: audit-service

---

### memory.extracted

Published after memories are extracted from a completed message.

| Field             | Type     | Description                                          |
| ----------------- | -------- | ---------------------------------------------------- |
| `userId`          | UUID     | The user whose memories were extracted               |
| `messageId`       | UUID     | Source message                                       |
| `threadId`        | UUID     | Source thread                                        |
| `memoriesCreated` | number   | Count of new memories stored                         |
| `memoriesSkipped` | number   | Count of duplicates skipped                          |
| `types`           | string[] | Types of memories extracted (FACT, PREFERENCE, etc.) |

**Publisher**: memory-service
**Consumers**: audit-service

---

### file.uploaded

Published when a file is successfully uploaded.

| Field       | Type   | Description          |
| ----------- | ------ | -------------------- |
| `fileId`    | UUID   | The uploaded file ID |
| `userId`    | UUID   | The uploader         |
| `filename`  | string | Original filename    |
| `mimeType`  | string | MIME type            |
| `sizeBytes` | number | File size            |

**Publisher**: file-service
**Consumers**: _(currently no consumers; reserved for future processing)_

---

### file.chunked

Published when a file has been chunked for context injection.

| Field             | Type   | Description                         |
| ----------------- | ------ | ----------------------------------- |
| `fileId`          | UUID   | The chunked file ID                 |
| `chunkCount`      | number | Number of chunks created            |
| `totalCharacters` | number | Total character count across chunks |

**Publisher**: file-service
**Consumers**: _(currently no consumers; reserved for future indexing)_

---

### log.server

Published by all backend services for centralized log aggregation.

| Field         | Type           | Description                      |
| ------------- | -------------- | -------------------------------- |
| `level`       | string         | "debug", "info", "warn", "error" |
| `serviceName` | string         | Originating service              |
| `module`      | string         | NestJS module name               |
| `action`      | string         | What was being done              |
| `message`     | string         | Log message                      |
| `requestId`   | string or null | X-Request-ID correlation         |
| `traceId`     | string or null | Distributed trace ID             |
| `userId`      | UUID or null   | Associated user                  |
| `threadId`    | UUID or null   | Associated thread                |
| `error`       | object or null | Error details (stack, code)      |
| `timestamp`   | ISO 8601       | When the log was created         |

**Publisher**: all 13 services
**Consumers**: server-logs-service

---

### image.generation.\*

Events related to AI image generation lifecycle.

| Event                        | Description                           |
| ---------------------------- | ------------------------------------- |
| `image.generation.started`   | Image generation job has been queued  |
| `image.generation.completed` | Image has been successfully generated |
| `image.generation.failed`    | Image generation failed               |

**Publisher**: image-service
**Consumers**: audit-service

---

## DLQ and Retry Strategy

### Retry Configuration

```
Max retries: 3
Retry delays:
  Attempt 1: 1 second
  Attempt 2: 5 seconds
  Attempt 3: 30 seconds

Strategy: Exponential backoff with fixed delays
```

### How Retries Work

1. Consumer receives a message and attempts processing
2. If processing throws an exception:
   a. Increment `x-retry-count` header
   b. If retry count < 3: republish to the same queue with a delay (using RabbitMQ delayed message plugin or TTL + dead-letter routing)
   c. If retry count >= 3: route to the DLQ
3. The DLQ (`claw.events.dlq.<service-name>`) holds failed messages for manual inspection

### Dead-Letter Exchange

```
Exchange: claw.events.dlx (direct, durable)

Queues:
  claw.events.dlq.routing    <- failed routing messages
  claw.events.dlq.chat       <- failed chat messages
  claw.events.dlq.memory     <- failed memory extraction
  claw.events.dlq.audit      <- failed audit logging
  claw.events.dlq.server-logs <- failed log ingestion
```

### DLQ Monitoring

Dead-letter queues should be monitored. Messages in the DLQ indicate:

- A consumer bug (most common)
- A downstream dependency failure (database, Ollama)
- A malformed event payload

Resolution: Fix the underlying issue, then replay messages from the DLQ.

---

## Error Handling

### Publisher-Side

- All event publishing uses the `RabbitMQService` wrapper from `shared-rabbitmq`
- If RabbitMQ is temporarily unreachable, the service logs a warning and continues (the HTTP response to the user is not blocked)
- Connection recovery is handled automatically by the amqplib client with reconnection backoff

### Consumer-Side

- Each consumer wraps processing in a try-catch
- Known transient errors (database timeout, Ollama unreachable) trigger a retry via NACK + requeue
- Known permanent errors (invalid payload, missing required fields) trigger immediate DLQ routing (no retry)
- Unknown errors are retried up to the max retry count

### Idempotency

Consumers should be idempotent because messages may be delivered more than once (at-least-once delivery). Key patterns:

- Memory extraction checks for duplicate memories before creating
- Audit logging uses `messageId` as a natural idempotency key
- Routing decisions are keyed by `messageId` (one decision per message)

---

## Ordering Guarantees

### Within a Single Queue

RabbitMQ guarantees FIFO ordering within a single queue with a single consumer. Messages published to the same queue are delivered in order.

### Across Queues

No ordering guarantees exist across different queues. For example, `message.created` and `message.routed` may be processed by their respective consumers in any relative order. The system handles this through:

- **Causal ordering via event chaining**: `message.routed` is only published AFTER the routing service has finished processing `message.created`. The chat service only processes `message.routed` after it has already stored the user message.
- **State checks**: Before processing an event, consumers verify that prerequisite state exists (e.g., the message record exists in the database).

### Parallelism

If multiple instances of a service consume from the same queue, messages are distributed round-robin. This means messages for different threads may be processed in parallel, but messages for the same thread are NOT guaranteed to be in order across instances. For chat messages, this is acceptable because each message triggers a distinct pipeline.

---

## Shared RabbitMQ Package

The `shared-rabbitmq` package provides:

### RabbitMQModule

NestJS dynamic module for RabbitMQ connection setup. Handles:

- Connection string configuration
- Exchange declaration
- Queue declaration and binding
- Connection recovery

### RabbitMQService

Service class for publishing events:

- `publish(routingKey: string, payload: unknown): Promise<void>`
- Automatic serialization to JSON
- Adds standard headers: `x-timestamp`, `x-source-service`, `x-request-id`
- Retry on publish failure (3 attempts)

### StructuredLogger

Logger utility that publishes `log.server` events:

- Wraps NestJS Logger
- Automatically includes service name, module, request context
- Redacts sensitive fields before publishing
