# Test Data Fixtures

> Mock data patterns, factory functions, seed scripts, and test utilities.

---

## 1. Mock Data Strategy

Test data in ClawAI follows these principles:

1. **Mock at the boundary**: Mock Prisma, HTTP clients, and RabbitMQ -- not internal logic
2. **Factory functions**: Create realistic test entities with overridable defaults
3. **No real databases**: Tests run without live database connections
4. **No real APIs**: Never call Ollama, OpenAI, or any external service in tests
5. **Seed scripts**: For local development and E2E testing only

---

## 2. Mock Entity Factories (Backend)

### Thread Factory

```typescript
function createMockThread(overrides: Partial<ChatThread> = {}): ChatThread {
  return {
    id: 'thread-' + crypto.randomUUID(),
    userId: 'user-123',
    title: 'Test Thread',
    routingMode: RoutingMode.AUTO,
    preferredProvider: null,
    preferredModel: null,
    systemPrompt: null,
    temperature: 0.7,
    maxTokens: 4096,
    contextPackIds: [],
    isPinned: false,
    isArchived: false,
    lastProvider: null,
    lastModel: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}
```

### Message Factory

```typescript
function createMockMessage(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: 'msg-' + crypto.randomUUID(),
    threadId: 'thread-123',
    role: MessageRole.USER,
    content: 'Hello, what is 2+2?',
    provider: null,
    model: null,
    routingMode: null,
    inputTokens: null,
    outputTokens: null,
    latencyMs: null,
    feedback: null,
    metadata: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// Convenience for ASSISTANT messages
function createMockAssistantMessage(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return createMockMessage({
    role: MessageRole.ASSISTANT,
    content: '2+2 equals 4.',
    provider: 'local-ollama',
    model: 'gemma3:4b',
    inputTokens: 15,
    outputTokens: 8,
    latencyMs: 450,
    ...overrides,
  });
}
```

### Connector Factory

```typescript
function createMockConnector(overrides: Partial<Connector> = {}): Connector {
  return {
    id: 'conn-' + crypto.randomUUID(),
    name: 'Test OpenAI Connector',
    provider: ConnectorProvider.OPENAI,
    status: ConnectorStatus.ACTIVE,
    encryptedConfig: 'encrypted-blob',
    baseUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}
```

### User Factory

```typescript
function createMockUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-' + crypto.randomUUID(),
    email: 'test@example.com',
    username: 'testuser',
    passwordHash: '$argon2id$...',
    role: UserRole.OPERATOR,
    status: UserStatus.ACTIVE,
    preferences: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}
```

### Memory Factory

```typescript
function createMockMemory(overrides: Partial<MemoryRecord> = {}): MemoryRecord {
  return {
    id: 'mem-' + crypto.randomUUID(),
    userId: 'user-123',
    type: MemoryType.FACT,
    content: 'User is a software engineer',
    sourceThreadId: null,
    sourceMessageId: null,
    isEnabled: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}
```

### Routing Decision Factory

```typescript
function createMockRoutingDecision(overrides: Partial<RoutingDecision> = {}): RoutingDecision {
  return {
    id: 'rd-' + crypto.randomUUID(),
    selectedProvider: 'local-ollama',
    selectedModel: 'gemma3:4b',
    confidence: 85,
    reasonTags: ['simple_qa', 'local_capable'],
    privacyClass: 'LOCAL',
    costClass: 'FREE',
    fallback: false,
    createdAt: new Date(),
    ...overrides,
  };
}
```

---

## 3. Mock Data Fixtures (Frontend)

### Thread List Fixture

```typescript
const mockThreadList: ChatThread[] = [
  {
    id: 'thread-1',
    title: 'Python Help',
    routingMode: RoutingMode.AUTO,
    isPinned: true,
    isArchived: false,
    createdAt: '2026-04-10T10:00:00Z',
    updatedAt: '2026-04-10T15:30:00Z',
  },
  {
    id: 'thread-2',
    title: 'Math Questions',
    routingMode: RoutingMode.LOCAL_ONLY,
    isPinned: false,
    isArchived: false,
    createdAt: '2026-04-09T08:00:00Z',
    updatedAt: '2026-04-09T09:15:00Z',
  },
];
```

### API Response Fixture

```typescript
const mockPaginatedResponse = {
  data: mockThreadList,
  meta: {
    total: 25,
    page: 1,
    limit: 10,
    totalPages: 3,
  },
};
```

---

## 4. Prisma Mock Setup

### Full Mock Pattern

```typescript
const mockPrismaService = {
  chatThread: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    updateMany: jest.fn(),
  },
  chatMessage: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  messageAttachment: {
    create: jest.fn(),
    findMany: jest.fn(),
    deleteMany: jest.fn(),
  },
  $transaction: jest.fn(async (fn) => fn(mockPrismaService)),
  $connect: jest.fn(),
  $disconnect: jest.fn(),
};
```

### Per-Test Setup

```typescript
beforeEach(() => {
  jest.clearAllMocks();
  // Reset to default return values
  mockPrismaService.chatThread.findMany.mockResolvedValue([]);
  mockPrismaService.chatThread.count.mockResolvedValue(0);
});
```

---

## 5. RabbitMQ Mock

```typescript
const mockRabbitMQService = {
  publish: jest.fn().mockResolvedValue(undefined),
  subscribe: jest.fn(),
  setupExchange: jest.fn(),
  setupQueue: jest.fn(),
};
```

---

## 6. Seed Scripts

### Admin User Seed

The auth-service creates a default admin user on startup using env vars:

```
ADMIN_EMAIL=admin@claw.local
ADMIN_USERNAME=admin
ADMIN_PASSWORD=Admin123!
```

### Model Catalog Seed

The ollama-service seeds the model catalog on startup:

```bash
cd apps/claw-ollama-service && npx tsx prisma/seed-catalog.ts
```

This populates 30 models across 6 categories (Coding, File Generation, Image Generation, Routing, Reasoning, Thinking).

### Running Seeds Manually

```bash
# Seed catalog (ollama service)
docker exec claw-ollama-service npx tsx prisma/seed-catalog.ts

# Run Prisma seed (if configured in package.json)
docker exec claw-auth-service npx prisma db seed
```

---

## 7. Test Utility Functions

### Common Test Helpers

```typescript
// Wait for async operations
async function waitFor(predicate: () => boolean, timeout = 5000): Promise<void> {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > timeout) throw new Error('Timeout waiting for condition');
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

// Create a valid JWT for testing
function createTestToken(payload: Record<string, unknown>): string {
  return jwt.sign(payload, 'test-secret', { expiresIn: '1h' });
}

// Generate a random UUID
function randomId(): string {
  return crypto.randomUUID();
}
```

---

## 8. Data Isolation in Tests

Each test should be independent:

```typescript
describe('MemoryService', () => {
  let service: MemoryService;

  beforeEach(() => {
    // Fresh mocks for each test
    jest.clearAllMocks();
    mockPrisma = createMockPrisma();
    service = new MemoryService(mockPrisma, mockRabbitMQ);
  });

  // Each test configures its own mock return values
  it('test 1', async () => {
    mockPrisma.memoryRecord.findMany.mockResolvedValue([createMockMemory()]);
    // ...
  });

  it('test 2', async () => {
    mockPrisma.memoryRecord.findMany.mockResolvedValue([]); // Different data
    // ...
  });
});
```

Rules:
- **Never share mutable state** between tests
- **Always use `beforeEach`** to reset mocks (not `beforeAll`)
- **Each test sets up its own data** via mock return values
- **Tests must pass in any order** (no dependencies between tests)
