# Service Layer Patterns

Patterns and rules for service classes across all ClawAI backend services.

---

## Core Rules

1. **Max 30 lines per method** — if longer, extract to private helpers or delegate to a Manager.
2. **Single responsibility** — each public method does ONE thing.
3. **Ownership validation** — services validate that the requesting user owns the resource.
4. **Event publishing** — services publish RabbitMQ events, not controllers or repositories.
5. **No direct Prisma/Mongoose calls** — delegate to repositories.
6. **No inline types/interfaces/enums/constants** — extract to dedicated files.

---

## Method Structure Template

```typescript
async createThread(userId: string, dto: CreateThreadDto): Promise<ChatThread> {
  // 1. Business validation (if needed)
  // 2. Call repository
  const thread = await this.threadRepository.create(userId, dto);
  // 3. Publish event
  await this.rabbitMQ.publish(EventPattern.THREAD_CREATED, { ... });
  // 4. Return result
  return thread;
}
```

---

## Ownership Validation Pattern

Every user-scoped resource must verify ownership before returning data:

```typescript
async getThread(id: string, userId: string): Promise<ChatThread> {
  const thread = await this.threadRepository.findById(id);
  if (!thread) {
    throw new EntityNotFoundException('ChatThread', id);
  }
  if (thread.userId !== userId) {
    throw new BusinessException(
      'Access denied',
      'FORBIDDEN',
      HttpStatus.FORBIDDEN,
    );
  }
  return thread;
}
```

Services that enforce ownership:
- **ChatThreadsService** — threads scoped to userId
- **ChatMessagesService** — messages scoped via thread ownership
- **MemoryService** — memories scoped to userId
- **ContextPacksService** — packs scoped to userId
- **FilesService** — files scoped to userId
- **ImageGenerationService** — generations scoped to userId
- **FileGenerationService** — generations scoped to userId

Services that do NOT enforce ownership (shared resources):
- **ConnectorsService** — connectors are global (admin-managed)
- **RoutingService** — policies are global
- **OllamaService** — models are global

---

## Event Publishing Pattern

Events are published in service methods after the database operation succeeds:

```typescript
async createMessage(userId: string, dto: CreateMessageDto): Promise<ChatMessage> {
  const thread = await this.validateThreadOwnership(dto.threadId, userId);
  const message = await this.messageRepository.create(dto.threadId, userId, dto);

  await this.rabbitMQ.publish(EventPattern.MESSAGE_CREATED, {
    messageId: message.id,
    threadId: message.threadId,
    userId,
    content: message.content,
    routingMode: thread.routingMode,
    forcedProvider: thread.preferredProvider,
    forcedModel: thread.preferredModel,
    timestamp: new Date().toISOString(),
  });

  return message;
}
```

---

## Pagination Pattern

All list methods follow the same pagination structure:

```typescript
async getThreads(
  userId: string,
  query: ListThreadsQueryDto,
): Promise<PaginatedResult<ThreadWithMessageCount>> {
  return this.threadRepository.findByUser(userId, {
    page: query.page ?? DEFAULT_PAGE,
    limit: query.limit ?? DEFAULT_PAGE_SIZE,
    search: query.search,
  });
}
```

The `PaginatedResult<T>` type:
```typescript
{
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

---

## Error Handling Pattern

Services throw specific exceptions — never swallow errors:

```typescript
// Entity not found
throw new EntityNotFoundException('Connector', id);

// Business rule violation
throw new BusinessException(
  'Cannot delete active connector',
  'CONNECTOR_ACTIVE',
  HttpStatus.CONFLICT,
);

// Forbidden access
throw new BusinessException(
  'Access denied',
  'FORBIDDEN',
  HttpStatus.FORBIDDEN,
);

// Duplicate entity
throw new DuplicateEntityException('User', 'email');
```

---

## Method Extraction Pattern

When a method exceeds 30 lines, extract logic to private helpers:

```typescript
// BAD: 50+ line method
async createMessage(userId: string, dto: CreateMessageDto): Promise<ChatMessage> {
  // ... validation ...
  // ... file attachment logic ...
  // ... message creation ...
  // ... event publishing ...
  // ... notification ...
}

// GOOD: orchestration method + private helpers
async createMessage(userId: string, dto: CreateMessageDto): Promise<ChatMessage> {
  const thread = await this.validateThreadOwnership(dto.threadId, userId);
  const message = await this.messageRepository.create(dto.threadId, userId, dto);
  await this.attachFiles(message.id, dto.fileIds);
  await this.publishMessageCreated(message, thread, userId);
  return message;
}

private async validateThreadOwnership(threadId: string, userId: string): Promise<ChatThread> { ... }
private async attachFiles(messageId: string, fileIds?: string[]): Promise<void> { ... }
private async publishMessageCreated(...): Promise<void> { ... }
```

---

## Service Constructor Pattern

Services inject repositories, RabbitMQ, and other services — never direct database clients:

```typescript
@Injectable()
export class ChatMessagesService {
  private readonly logger = new Logger(ChatMessagesService.name);

  constructor(
    private readonly messageRepository: ChatMessagesRepository,
    private readonly threadRepository: ChatThreadsRepository,
    private readonly rabbitMQ: RabbitMQService,
  ) {}
}
```

---

## Inter-Service HTTP Calls

When a service needs data from another service, use HTTP calls (never shared databases):

```typescript
// In chat service — fetching memories from memory service
const memories = await httpGet(
  `${this.config.memoryServiceUrl}/api/v1/internal/memories/for-context?userId=${userId}&limit=20`,
);
```

Internal endpoints are:
- `/api/v1/internal/memories/for-context` — memory service
- `/api/v1/internal/context-packs/:id/items` — memory service
- `/api/v1/internal/files/:id/chunks` — file service
- `/api/v1/internal/files/:id/content` — file service
- `/api/v1/internal/connectors/config?provider=X` — connector service
- `/api/v1/internal/ollama/router-model` — ollama service
- `/api/v1/internal/ollama/installed-models` — ollama service
- `/api/v1/internal/images/generate` — image service
- `/api/v1/internal/file-generations/generate` — file generation service

---

## Toggle Pattern

For boolean state toggles (e.g., enable/disable memory):

```typescript
async toggleMemory(id: string, userId: string): Promise<MemoryRecord> {
  const memory = await this.getMemory(id, userId); // validates ownership
  return this.memoryRepository.update(id, { isEnabled: !memory.isEnabled });
}
```

---

## Deactivation Pattern (Soft Delete)

Users are soft-deleted by changing status, not removing the row:

```typescript
async deactivateUser(id: string, adminId: string): Promise<SafeUser> {
  this.validateNotSelf(id, adminId);
  const user = await this.findById(id);
  const updated = await this.userRepository.updateStatus(id, UserStatus.SUSPENDED);
  await this.rabbitMQ.publish(EventPattern.USER_DEACTIVATED, { ... });
  return updated;
}
```

---

## Service Files by Domain

| Service | File | Key Methods |
|---------|------|-------------|
| auth | `auth.service.ts` | login, refresh, logout, getProfile |
| auth | `users.service.ts` | create, findAll, findById, updateUser, deactivateUser, changeRole, changePassword, updatePreferences |
| chat | `chat-threads.service.ts` | createThread, getThreads, getThread, updateThread, deleteThread |
| chat | `chat-messages.service.ts` | createMessage, getMessages, getMessage, regenerateMessage, setFeedback |
| chat | `chat-stream.service.ts` | SSE event bus management |
| connector | `connectors.service.ts` | createConnector, getConnectors, updateConnector, deleteConnector, testConnector, syncModels, getModels, getConnectorConfig |
| routing | `routing.service.ts` | createPolicy, getPolicies, updatePolicy, deletePolicy, evaluateRoute, getDecisions |
| memory | `memory.service.ts` | createMemory, getMemories, getMemory, updateMemory, deleteMemory, toggleMemory, getMemoriesForContext |
| memory | `context-packs.service.ts` | createContextPack, getContextPacks, getContextPack, updateContextPack, deleteContextPack, addItem, removeItem |
| file | `files.service.ts` | uploadFile, getFiles, getFile, deleteFile, downloadFile, getChunks, storeImage |
| audit | `audits.service.ts` | getAuditLogs, getAuditStats |
| audit | `usage.service.ts` | getUsageEntries, getUsageSummary, getCostSummary, getLatencySummary |
| ollama | `ollama.service.ts` | getModels, getCatalog, pullModel, pullFromCatalog, assignRole, generate, checkHealth, getRuntimes |
| image | `image-generation.service.ts` | enqueueGeneration, listByUser, getByIdForUser, retryGeneration, retryWithAlternateModel |
| file-gen | `file-generation.service.ts` | enqueueGeneration, listByUser, getByIdForUser, retryGeneration |
| client-logs | `client-logs.service.ts` | create, search, getStats |
| server-logs | `server-logs.service.ts` | createLog, createMany, getLogs, getStats |
| health | `health.service.ts` | checkAll |
