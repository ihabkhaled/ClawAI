# Skill: RabbitMQ Event Bus Toolkit

> Use this skill when publishing events, consuming events, or debugging message flow in the RabbitMQ event bus.

---

## Architecture Overview

```
Exchange: claw.events (topic, durable)
  Routing key: <domain>.<action>  (e.g., message.created, connector.synced)

Publisher → Exchange → Queue → Consumer
                    ↓
              Dead Letter Queue (claw.events.dlq) — after 3 retry attempts
```

---

## Publishing Events (Service Layer)

```typescript
// In a service class:
import { RabbitMQService } from '@claw/shared-rabbitmq';
import { MESSAGE_EVENTS } from '@claw/shared-types';

@Injectable()
export class ChatMessagesService {
  constructor(
    private readonly rabbitMQ: RabbitMQService,
    // ...other deps
  ) {}

  async create(userId: string, dto: CreateMessageDto): Promise<ChatMessage> {
    const message = await this.repository.create(userId, dto);

    // Publish AFTER successful persistence
    await this.rabbitMQ.publish(MESSAGE_EVENTS.CREATED, {
      messageId: message.id,
      threadId: message.threadId,
      userId,
      content: dto.content,
      correlationId: dto.correlationId,
    });

    return message;
  }
}
```

**Rules:**

- Always publish AFTER the DB write succeeds
- Always include `correlationId` in payload for tracing
- Use constants from `packages/shared-types` for event patterns
- Never publish from controllers

---

## Consuming Events (Controller Layer)

```typescript
// In a controller class (consumer side):
import { EventPattern, Payload } from '@nestjs/microservices';
import { MESSAGE_EVENTS } from '@claw/shared-types';

@Controller()
export class RoutingController {
  constructor(private readonly service: RoutingService) {}

  @EventPattern(MESSAGE_EVENTS.CREATED)
  async handleMessageCreated(@Payload() payload: MessageCreatedPayload): Promise<void> {
    // Validate payload
    const validated = validateDto(MessageCreatedPayloadSchema, payload);
    // Delegate to service
    await this.service.handleMessageCreated(validated);
  }
}
```

**Rules:**

- Validate the payload before using it (RabbitMQ messages are `unknown`)
- Delegate to service — no business logic in consumer controller
- Use `@EventPattern` for fire-and-forget events (no return value needed)
- Use `@MessagePattern` for RPC-style request/response

---

## Adding a New Event

### Step 1: Define pattern in shared-types

```typescript
// packages/shared-types/src/events.ts
export const CONNECTOR_EVENTS = {
  SYNCED: 'connector.synced',
  HEALTH_CHECKED: 'connector.health_checked',
  MODEL_SYNC_COMPLETED: 'connector.model_sync_completed', // NEW
} as const;
```

### Step 2: Define payload type in shared-types

```typescript
// packages/shared-types/src/payloads.ts
export type ConnectorModelSyncCompletedPayload = {
  connectorId: string;
  modelsUpserted: number;
  totalModels: number;
  correlationId: string;
  timestamp: string;
};
```

### Step 3: Publish from service

```typescript
await this.rabbitMQ.publish(CONNECTOR_EVENTS.MODEL_SYNC_COMPLETED, {
  connectorId: connector.id,
  modelsUpserted: result.upserted,
  totalModels: result.total,
  correlationId: requestCorrelationId,
  timestamp: new Date().toISOString(),
});
```

### Step 4: Subscribe in consuming service

```typescript
@EventPattern(CONNECTOR_EVENTS.MODEL_SYNC_COMPLETED)
async handleModelSyncCompleted(
  @Payload() payload: ConnectorModelSyncCompletedPayload
): Promise<void> {
  await this.service.handleModelSyncCompleted(payload);
}
```

### Step 5: Update root CLAUDE.md event bus table

Add the new event to the event bus table in root CLAUDE.md.

---

## Error Handling in Consumers

Consumer handlers are fire-and-forget. If they throw, RabbitMQ retries 3 times, then sends to DLQ.

```typescript
// In consumer controller (do NOT put try/catch here):
@EventPattern(MESSAGE_EVENTS.CREATED)
async handleMessageCreated(@Payload() payload: unknown): Promise<void> {
  const validated = validateDto(MessageCreatedPayloadSchema, payload);
  await this.service.handleMessageCreated(validated);
  // If service throws → RabbitMQ retries → after 3 failures → DLQ
}

// In the service (put error handling here):
async handleMessageCreated(payload: MessageCreatedPayload): Promise<void> {
  try {
    await this.routingManager.route(payload);
  } catch (error: unknown) {
    this.logger.error(`handleMessageCreated failed: ${String(error)}`);
    // Re-throw to trigger retry → DLQ
    throw error;
  }
}
```

**For background flows** (fire-and-forget from manager):

```typescript
// The manager must store an error record even if it throws
async executeWithFallback(payload: ExecutionPayload): Promise<void> {
  try {
    await this.callProvider(payload);
  } catch (error: unknown) {
    // Emit SSE error FIRST
    try {
      this.emitError(payload.threadId, 'Failed to get AI response');
    } catch {
      // ignore SSE emit failure
    }
    // Then store error record in DB
    try {
      await this.storeErrorMessage(payload.threadId);
    } catch {
      // ignore DB store failure
    }
    // Re-throw so caller knows it failed
    throw error;
  }
}
```

---

## Inspecting Events via RabbitMQ Management

```bash
# Open management UI
open http://localhost:15672
# Default creds: from RABBITMQ_USER/RABBITMQ_PASSWORD in .env

# API: List all exchanges
curl -s -u admin:admin http://localhost:15672/api/exchanges/%2F/ | jq '.[] | .name'

# API: List all queues and their depths
curl -s -u admin:admin http://localhost:15672/api/queues/%2F/ | \
  jq '.[] | {name:.name, messages:.messages, consumers:.consumers}'

# API: Check DLQ for failed messages
curl -s -u admin:admin "http://localhost:15672/api/queues/%2F/claw.events.dlq" | \
  jq '{messages:.messages, consumers:.consumers}'

# Peek at DLQ messages (gets 1 message, does NOT consume)
curl -s -u admin:admin -X POST \
  "http://localhost:15672/api/queues/%2F/claw.events.dlq/get" \
  -H "Content-Type: application/json" \
  -d '{"count":5,"ackmode":"ack_requeue_true","encoding":"auto"}' | jq .
```

---

## Verifying Event Flow via Logs

```bash
# Verify publisher sent event
docker compose -f docker-compose.dev.yml logs connector-service --tail=50 | \
  grep "Published event\|connector.synced"

# Verify consumer received event
docker compose -f docker-compose.dev.yml logs routing-service --tail=50 | \
  grep "handleConnectorSynced\|Received event"

# Verify event correlation (trace by correlationId)
CORRELATION="some-uuid"
docker compose -f docker-compose.dev.yml logs --tail=500 | \
  grep "$CORRELATION"
```

---

## Event Bus Table Reference

| Event Pattern                | Publisher | Consumers      |
| ---------------------------- | --------- | -------------- |
| `message.created`            | chat      | routing        |
| `message.routed`             | routing   | chat           |
| `message.completed`          | chat      | audit, memory  |
| `thread.created`             | chat      | —              |
| `user.login`                 | auth      | audit          |
| `user.logout`                | auth      | audit          |
| `connector.created`          | connector | audit          |
| `connector.updated`          | connector | audit          |
| `connector.deleted`          | connector | audit          |
| `connector.synced`           | connector | audit, routing |
| `connector.health_checked`   | connector | audit, routing |
| `routing.decision_made`      | routing   | audit          |
| `memory.extracted`           | memory    | audit          |
| `file.uploaded`              | file      | —              |
| `file.chunked`               | file      | —              |
| `image.generated`            | image     | audit          |
| `image.failed`               | image     | audit          |
| `file.generated`             | file-gen  | audit          |
| `file_generation.failed`     | file-gen  | audit          |
| `agent.session.connected`    | agent     | audit          |
| `agent.session.disconnected` | agent     | audit          |
| `agent.device_paired`        | agent     | audit          |
