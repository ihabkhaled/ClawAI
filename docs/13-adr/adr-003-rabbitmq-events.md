# ADR-003: RabbitMQ Topic Exchange with DLQ

## Status

Accepted (2025-Q1)

## Context

With 13 microservices, services need to communicate asynchronously. The message flow alone involves at least 5 services (chat, routing, memory, audit, and optionally file/connector). Synchronous HTTP calls for every inter-service interaction would create tight coupling, cascade failures, and make the system fragile.

The team evaluated several async messaging approaches. Key requirements:

- **Fan-out**: A single event (e.g., `message.completed`) must be consumed by multiple services (audit + memory)
- **Reliability**: Events must not be lost if a consumer is temporarily down
- **Retry with backoff**: Failed event processing must be retried before being dead-lettered
- **Routing flexibility**: Consumers should subscribe to specific event patterns, not all events
- **Operational simplicity**: Must work in Docker Compose without external managed services

## Decision

Use RabbitMQ with a single durable topic exchange (`claw.events`) for all inter-service events. Each consumer binds a queue with a routing key pattern (e.g., `message.*`, `connector.#`).

### Implementation Details

- **Exchange**: `claw.events` (topic, durable)
- **Queue naming**: `<service>.<event-pattern>` (e.g., `audit.message.completed`)
- **Retry**: 3 retries with exponential backoff (1s, 5s, 15s)
- **DLQ**: Dead-letter exchange `claw.events.dlq` catches messages that fail all retries
- **Shared package**: `packages/shared-rabbitmq` provides `RabbitMQModule` and `RabbitMQService` with built-in retry and DLQ logic
- **Event payloads**: Typed in `packages/shared-types` with explicit pattern constants

### Event Flow Example

```
chat-service publishes message.completed
  → routing-service queue (bound to message.*) - ignored
  → audit-service queue (bound to message.completed) - logs usage
  → memory-service queue (bound to message.completed) - extracts memories
```

## Consequences

### Positive

- **Decoupled publishers and consumers**: Chat service does not know (or care) who consumes `message.completed`.
- **Fan-out**: Multiple services can independently consume the same event without coordination.
- **Reliability**: Durable queues persist messages across RabbitMQ restarts. Consumers process at their own pace.
- **Dead-letter queue**: Failed messages are preserved for debugging rather than silently dropped.
- **Topic routing**: Services subscribe only to events they care about, reducing noise.

### Negative

- **Eventual consistency**: After publishing, consumers may take seconds to process. The UI must tolerate stale reads.
- **Debugging complexity**: Tracing an event from publisher to consumer requires checking RabbitMQ management UI or correlating logs via requestId.
- **Message ordering**: RabbitMQ does not guarantee strict ordering across queues. For ClawAI this is acceptable because events are independent.
- **Infrastructure dependency**: RabbitMQ must be running for async flows to work. Mitigated by Docker Compose `depends_on` with health checks.

## Alternatives Considered

### HTTP Callbacks (Webhooks)

Each service registers callback URLs with publishers. Simple to understand but creates tight coupling (publisher must know all consumer URLs), no built-in retry, and cascade failures if a consumer is down.

### Redis Pub/Sub

Lightweight and fast, but messages are fire-and-forget. If a consumer is down when a message is published, it is lost forever. No persistence, no retry, no DLQ. Rejected because reliability is a hard requirement.

### Apache Kafka

Provides strong ordering, replay capability, and excellent throughput. However, Kafka is operationally heavy (ZooKeeper/KRaft, partition management, consumer group coordination). Rejected as overkill for the current event volume (hundreds per minute, not millions).

### NATS / NATS JetStream

Lightweight, fast, and supports persistence with JetStream. A viable alternative, but the team had more experience with RabbitMQ and its management UI. Could revisit if performance becomes a concern.
