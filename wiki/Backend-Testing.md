> **Canonical source:** `docs/09-testing/backend-testing-guide.md`

# Backend Testing Guide

> Vitest patterns, mocking Prisma, mocking RabbitMQ, test file structure, and examples.

---

## 1. Configuration

Each backend service has its own `vitest.config.ts`. Tests use:

- **Extension**: `*.spec.ts`
- **Location**: `__tests__/` directories adjacent to source
- **Runner**: Vitest (`vitest run`) with the `unplugin-swc` transform (emits decorator metadata Nest DI needs; esbuild does not). `globals: true`, so `describe`/`it`/`expect`/`vi` need no import
- **Module aliases**: Path aliases matching `tsconfig.json`

### File Structure

```
apps/claw-auth-service/
  src/
    modules/auth/
      managers/
        auth.manager.ts
        __tests__/
          auth.manager.spec.ts
      services/
        auth.service.ts
        __tests__/
          auth.service.spec.ts
      dto/
        login.dto.ts
        __tests__/
          login.dto.spec.ts
    common/utilities/
      hashing.utility.ts
      __tests__/
        hashing.utility.spec.ts
    __tests__/
      app.spec.ts                   # Bootstrap test
```

---

## 2. Test Structure Pattern

Use `describe`/`it` blocks with behavior-focused descriptions:

```typescript
describe('ChatThreadsService', () => {
  let service: ChatThreadsService;
  let mockPrisma: MockPrismaService;
  let mockRabbitMQ: MockRabbitMQService;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    mockRabbitMQ = createMockRabbitMQ();
    service = new ChatThreadsService(mockPrisma, mockRabbitMQ);
  });

  describe('create', () => {
    it('should create a thread with valid input', async () => {
      mockPrisma.chatThread.create.mockResolvedValue(mockThread);
      const result = await service.create(validInput, userId);
      expect(result.title).toBe(validInput.title);
      expect(mockPrisma.chatThread.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ userId }) }),
      );
    });

    it('should set default routing mode when none provided', async () => {
      mockPrisma.chatThread.create.mockResolvedValue(mockThread);
      const result = await service.create({ title: 'Test' }, userId);
      expect(result.routingMode).toBe(RoutingMode.AUTO);
    });
  });

  describe('findByUser', () => {
    it('should return only threads owned by the user', async () => {
      mockPrisma.chatThread.findMany.mockResolvedValue([mockThread]);
      const result = await service.findByUser(userId, {});
      expect(mockPrisma.chatThread.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ userId }) }),
      );
    });

    it('should paginate results', async () => {
      mockPrisma.chatThread.findMany.mockResolvedValue([]);
      mockPrisma.chatThread.count.mockResolvedValue(0);
      const result = await service.findByUser(userId, { page: 2, limit: 10 });
      expect(mockPrisma.chatThread.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
    });
  });
});
```

---

## 3. Mocking Prisma

### Mock Factory

Create a mock that mirrors the Prisma client structure:

```typescript
function createMockPrisma() {
  return {
    chatThread: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    chatMessage: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    // Add other models as needed
    $transaction: vi.fn((fn) => fn(createMockPrisma())),
  };
}
```

### Using in NestJS Testing Module

```typescript
const module = await Test.createTestingModule({
  providers: [
    ChatThreadsService,
    {
      provide: PrismaService,
      useValue: createMockPrisma(),
    },
    {
      provide: RabbitMQService,
      useValue: createMockRabbitMQ(),
    },
  ],
}).compile();

service = module.get(ChatThreadsService);
```

### Mock Return Values

```typescript
// Return a single entity
mockPrisma.chatThread.findUnique.mockResolvedValue(mockThread);

// Return null (not found)
mockPrisma.chatThread.findUnique.mockResolvedValue(null);

// Return a list
mockPrisma.chatThread.findMany.mockResolvedValue([mockThread1, mockThread2]);

// Throw an error
mockPrisma.chatThread.create.mockRejectedValue(new Error('Unique constraint violation'));

// Transaction
mockPrisma.$transaction.mockImplementation(async (fn) => fn(mockPrisma));
```

---

## 4. Mocking RabbitMQ

```typescript
function createMockRabbitMQ() {
  return {
    publish: vi.fn().mockResolvedValue(undefined),
    subscribe: vi.fn(),
  };
}
```

### Verifying Event Publishing

```typescript
it('should publish thread.created event', async () => {
  mockPrisma.chatThread.create.mockResolvedValue(mockThread);
  await service.create(validInput, userId);

  expect(mockRabbitMQ.publish).toHaveBeenCalledWith(
    'thread.created',
    expect.objectContaining({
      threadId: mockThread.id,
      userId,
    }),
  );
});
```

---

## 5. Mocking Other Dependencies

### HTTP Service (Inter-Service Calls)

```typescript
const mockHttpService = {
  get: vi.fn(),
  post: vi.fn(),
};

// Mock a successful response
mockHttpService.get.mockReturnValue({
  pipe: vi.fn().mockReturnValue(of({ data: mockResponse })),
});
```

### Redis/Cache Manager

```typescript
const mockCacheManager = {
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
};
```

### Logger

```typescript
const mockLogger = {
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
};
```

---

## 6. Testing DTOs (Zod Schemas)

```typescript
describe('CreateConnectorDto', () => {
  const validData = {
    name: 'My OpenAI Connector',
    provider: 'OPENAI',
    config: { apiKey: 'sk-test-key' },
  };

  it('should accept valid connector data', () => {
    const result = createConnectorSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should reject missing name', () => {
    const { name, ...noName } = validData;
    const result = createConnectorSchema.safeParse(noName);
    expect(result.success).toBe(false);
  });

  it('should reject name exceeding max length', () => {
    const result = createConnectorSchema.safeParse({
      ...validData,
      name: 'a'.repeat(256),
    });
    expect(result.success).toBe(false);
  });

  it('should reject invalid provider', () => {
    const result = createConnectorSchema.safeParse({
      ...validData,
      provider: 'INVALID',
    });
    expect(result.success).toBe(false);
  });
});
```

---

## 7. Testing Services

### Happy Path

```typescript
it('should create a memory record', async () => {
  const input = { content: 'User prefers dark mode', type: MemoryType.PREFERENCE };
  mockPrisma.memoryRecord.create.mockResolvedValue({ id: '1', ...input, userId });

  const result = await service.create(input, userId);

  expect(result.content).toBe(input.content);
  expect(result.type).toBe(MemoryType.PREFERENCE);
});
```

### Not Found

```typescript
it('should throw EntityNotFoundException when thread not found', async () => {
  mockPrisma.chatThread.findUnique.mockResolvedValue(null);

  await expect(service.findOne('nonexistent-id', userId)).rejects.toThrow(EntityNotFoundException);
});
```

### Authorization

```typescript
it('should throw ForbiddenException when user does not own the thread', async () => {
  mockPrisma.chatThread.findUnique.mockResolvedValue({
    ...mockThread,
    userId: 'other-user',
  });

  await expect(service.delete('thread-id', 'my-user-id')).rejects.toThrow(BusinessException);
});
```

---

## 8. Testing Managers

```typescript
describe('RoutingManager', () => {
  describe('routeMessage', () => {
    it('should call Ollama for AUTO mode routing', async () => {
      mockOllamaClient.generate.mockResolvedValue({
        provider: 'anthropic',
        model: 'claude-sonnet-4',
      });

      const result = await manager.routeMessage(message, RoutingMode.AUTO);

      expect(mockOllamaClient.generate).toHaveBeenCalled();
      expect(result.selectedProvider).toBe('anthropic');
    });

    it('should fall back to heuristic routing on Ollama failure', async () => {
      mockOllamaClient.generate.mockRejectedValue(new Error('Ollama unavailable'));

      const result = await manager.routeMessage(message, RoutingMode.AUTO);

      expect(result.selectedProvider).toBeDefined();
      expect(result.confidence).toBeLessThan(100);
    });
  });
});
```

---

## 9. App Bootstrap Tests

Every service has an `app.spec.ts` that verifies dependency injection:

```typescript
describe('App Module', () => {
  it('should create the application module', async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const app = module.createNestApplication();
    await app.init();
    expect(app).toBeDefined();
    await app.close();
  });
});
```

This catches:

- Missing provider registrations
- Circular dependency injection errors
- Invalid module configuration

---

## 10. Running Backend Tests

```bash
# All backend tests
npm run test

# Specific service
npm run test --workspace=apps/claw-auth-service

# Watch mode
cd apps/claw-auth-service && npx vitest

# Single file
cd apps/claw-chat-service && npx vitest run src/modules/chat/services/__tests__/chat.service.spec.ts

# With coverage
cd apps/claw-auth-service && npx vitest run --coverage

# Run matching test names
cd apps/claw-auth-service && npx vitest run -t "should create"
```

