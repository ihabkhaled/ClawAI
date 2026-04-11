# Repository Layer Patterns

Repository classes provide pure data access. They are the only layer that interacts with the database.

---

## Core Rules

1. **Pure data access ONLY** — no business logic, no validation, no event publishing
2. **No throw statements** — return data or null, let services decide what to do
3. **Each method maps to ONE database operation** — no multi-step transactions (use services for that)
4. **Use Prisma query builders** — no raw SQL
5. **No inline types/interfaces/enums/constants** — extract to dedicated files
6. **Repository methods are async** and return Prisma model types or null

---

## Repository Constructor Pattern

Repositories inject PrismaService (generated client):

```typescript
@Injectable()
export class ChatThreadsRepository {
  constructor(private readonly prisma: PrismaService) {}
}
```

For MongoDB services (audit, client-logs, server-logs), inject the Mongoose model:

```typescript
@Injectable()
export class AuditLogRepository {
  constructor(
    @InjectModel(AuditLog.name) private readonly auditLogModel: Model<AuditLog>,
  ) {}
}
```

---

## CRUD Patterns

### Create

```typescript
async create(userId: string, dto: CreateThreadDto): Promise<ChatThread> {
  return this.prisma.chatThread.create({
    data: {
      userId,
      title: dto.title,
      routingMode: dto.routingMode,
      preferredProvider: dto.preferredProvider,
      preferredModel: dto.preferredModel,
      systemPrompt: dto.systemPrompt,
      temperature: dto.temperature,
      maxTokens: dto.maxTokens,
      contextPackIds: dto.contextPackIds ?? [],
    },
  });
}
```

### Find by ID

```typescript
async findById(id: string): Promise<ChatThread | null> {
  return this.prisma.chatThread.findUnique({
    where: { id },
  });
}
```

Returns `null` if not found — never throws.

### Find with Relations

```typescript
async findByIdWithModels(id: string): Promise<ConnectorWithModels | null> {
  return this.prisma.connector.findUnique({
    where: { id },
    include: { models: true },
  });
}
```

### Update

```typescript
async update(id: string, data: Partial<UpdateThreadDto>): Promise<ChatThread> {
  return this.prisma.chatThread.update({
    where: { id },
    data,
  });
}
```

### Delete

```typescript
async delete(id: string): Promise<ChatThread> {
  return this.prisma.chatThread.delete({
    where: { id },
  });
}
```

### Delete with Cascade

Cascading deletes are handled by Prisma schema (`onDelete: Cascade`), not in repository code. Deleting a ChatThread automatically deletes its ChatMessages and MessageAttachments.

---

## Pagination Pattern

All list queries follow the standard pagination pattern:

```typescript
async findByUser(
  userId: string,
  options: { page: number; limit: number; search?: string },
): Promise<PaginatedResult<ChatThread>> {
  const where: Prisma.ChatThreadWhereInput = { userId };

  if (options.search) {
    where.title = { contains: options.search, mode: 'insensitive' };
  }

  const [data, total] = await Promise.all([
    this.prisma.chatThread.findMany({
      where,
      skip: (options.page - 1) * options.limit,
      take: options.limit,
      orderBy: { createdAt: 'desc' },
    }),
    this.prisma.chatThread.count({ where }),
  ]);

  return {
    data,
    meta: {
      page: options.page,
      limit: options.limit,
      total,
      totalPages: Math.ceil(total / options.limit),
    },
  };
}
```

Key aspects:
- Use `Promise.all` for parallel count + data queries
- Default ordering is `createdAt: 'desc'` (newest first)
- Search uses `contains` with `mode: 'insensitive'` for case-insensitive matching
- Return `PaginatedResult<T>` with meta object

---

## Filter Pattern

Complex filters are built as Prisma `where` objects:

```typescript
async findAll(options: {
  page: number;
  limit: number;
  provider?: ConnectorProvider;
  status?: ConnectorStatus;
}): Promise<PaginatedResult<ConnectorWithModels>> {
  const where: Prisma.ConnectorWhereInput = {};

  if (options.provider) {
    where.provider = options.provider;
  }
  if (options.status) {
    where.status = options.status;
  }

  // ... pagination query ...
}
```

---

## MongoDB Repository Pattern

For MongoDB-backed services:

```typescript
async findWithPagination(
  filter: FilterQuery<AuditLog>,
  page: number,
  limit: number,
): Promise<PaginatedResult<AuditLog>> {
  const [data, total] = await Promise.all([
    this.auditLogModel
      .find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .exec(),
    this.auditLogModel.countDocuments(filter),
  ]);

  return {
    data,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}
```

---

## Unique Constraint Handling

Repositories do not throw on unique constraint violations. They return the data, and the service checks for duplicates beforehand:

```typescript
// Repository — just creates
async create(data: CreateUserData): Promise<User> {
  return this.prisma.user.create({ data });
}

// Service — checks for duplicates first
async create(dto: CreateUserDto): Promise<SafeUser> {
  const existing = await this.userRepository.findByEmail(dto.email);
  if (existing) {
    throw new DuplicateEntityException('User', 'email');
  }
  return this.userRepository.create(dto);
}
```

---

## Aggregation Pattern

For count/stats queries:

```typescript
async countByStatus(): Promise<Record<string, number>> {
  const results = await this.prisma.connector.groupBy({
    by: ['status'],
    _count: true,
  });
  return Object.fromEntries(
    results.map((r) => [r.status, r._count]),
  );
}
```

---

## Repository Files by Domain

| Service | Repository | Database | Key Tables |
|---------|-----------|----------|------------|
| auth | `users.repository.ts` | PostgreSQL claw_auth | users, sessions |
| auth | `sessions.repository.ts` | PostgreSQL claw_auth | sessions |
| auth | `system-settings.repository.ts` | PostgreSQL claw_auth | system_settings |
| chat | `chat-threads.repository.ts` | PostgreSQL claw_chat | chat_threads |
| chat | `chat-messages.repository.ts` | PostgreSQL claw_chat | chat_messages, message_attachments |
| connector | `connectors.repository.ts` | PostgreSQL claw_connectors | connectors, connector_models |
| connector | `health-events.repository.ts` | PostgreSQL claw_connectors | connector_health_events |
| connector | `sync-runs.repository.ts` | PostgreSQL claw_connectors | model_sync_runs |
| routing | `routing.repository.ts` | PostgreSQL claw_routing | routing_decisions, routing_policies |
| memory | `memory.repository.ts` | PostgreSQL claw_memory | memory_records |
| memory | `context-packs.repository.ts` | PostgreSQL claw_memory | context_packs, context_pack_items |
| file | `files.repository.ts` | PostgreSQL claw_files | files |
| file | `file-chunks.repository.ts` | PostgreSQL claw_files | file_chunks |
| ollama | `ollama.repository.ts` | PostgreSQL claw_ollama | local_models, local_model_roles, pull_jobs, runtime_configs, model_catalog_entries |
| image | `image-generation.repository.ts` | PostgreSQL claw_images | image_generations, image_generation_assets, image_generation_events |
| file-gen | `file-generation.repository.ts` | PostgreSQL claw_file_generations | file_generations, file_generation_assets, file_generation_events |
| audit | `audit-log.repository.ts` | MongoDB claw_audit | audit_logs |
| audit | `usage-ledger.repository.ts` | MongoDB claw_audit | usage_ledger |
| client-logs | `client-logs.repository.ts` | MongoDB claw_client_logs | client_logs |
| server-logs | `server-logs.repository.ts` | MongoDB claw_server_logs | server_logs |

---

## Anti-Patterns

```typescript
// BAD: Business logic in repository
async findActiveConnector(provider: string): Promise<Connector> {
  const connector = await this.prisma.connector.findFirst({ where: { provider } });
  if (!connector) {
    throw new EntityNotFoundException('Connector', provider); // NO THROW
  }
  return connector;
}

// GOOD: Return null, let service decide
async findByProvider(provider: string): Promise<Connector | null> {
  return this.prisma.connector.findFirst({
    where: { provider, isEnabled: true },
  });
}
```
