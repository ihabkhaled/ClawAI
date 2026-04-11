# Manager Layer Patterns

Manager classes handle complex orchestration that exceeds the scope of a service method. They coordinate multiple service calls, external APIs, retries, and multi-step workflows.

---

## When to Use a Manager

Use a Manager class when:
- A workflow involves **multiple service calls** that must be coordinated
- **External API calls** with retry logic, fallback chains, or error recovery
- **Complex data transformation** spanning multiple sources
- A single service method would exceed **30 lines**
- The logic involves **cross-cutting concerns** (e.g., context assembly from 4 services)

Do NOT use a Manager when:
- Simple CRUD that fits in 30 lines
- Single repository call + event publish
- Pure validation logic (use service private methods instead)

---

## Core Rules

1. **Max 80 lines per method, complexity limit 15**
2. **Break into private helpers** — each helper should be <30 lines
3. **Name methods clearly**: `buildPromptString()`, `fetchConnectorConfig()`, `parseResponse()`
4. **Managers are `@Injectable()`** — registered in the module like services
5. **No inline types/interfaces/enums/constants** — extract to dedicated files
6. **Services call managers** — controllers never call managers directly

---

## Existing Managers in ClawAI

### ChatExecutionManager (chat-service)

Orchestrates the full AI response flow after routing:

```
handleMessageRouted()
  -> fetchConnectorConfig() from connector-service (HTTP)
  -> buildProviderRequest() with context, model, temperature
  -> callProvider() with retry + fallback chain
  -> storeAssistantMessage() in repository
  -> publishMessageCompleted() event
  -> emitSSE() completion to frontend
```

Key patterns:
- **Fallback chain**: If primary provider fails, tries fallbackProvider/fallbackModel
- **Error message storage**: On total failure, stores ASSISTANT message with `metadata: { error: true }`
- **SSE emission**: Emits events on success AND failure so frontend can react

### ContextAssemblyManager (chat-service)

Assembles the full prompt context from multiple services:

```
assemble(threadId, userId)
  -> fetchMemories() from memory-service (HTTP, limit 20)
  -> fetchContextPackItems() from memory-service (HTTP, per pack)
  -> fetchFileChunks() from file-service (HTTP, per attached file)
  -> getThreadHistory() from local repository
  -> buildPrompt(): system -> memories -> packs -> files -> history
  -> truncateToTokenBudget() (keeps head, drops tail)
```

Key patterns:
- **Parallel fetching**: Memories, packs, and files fetched concurrently
- **Token budget**: Truncates from the end to fit within model's context window
- **Graceful degradation**: If a service is down, continues without that context

### RoutingManager (routing-service)

Makes intelligent routing decisions using Ollama or heuristics:

```
route(messagePayload)
  -> fetchInstalledModels() from ollama-service (HTTP)
  -> buildRouterPrompt() with dynamic model list
  -> callOllamaRouter() with Zod-validated response
  -> fallbackToHeuristic() if Ollama fails
  -> storeDecision() in repository
  -> publishDecisionMade() event
```

### PromptBuilderManager (routing-service)

Builds dynamic router prompts based on installed models:

```
buildPrompt(content, routingMode)
  -> getInstalledModels() from cache or ollama-service
  -> groupByCategory() (coding, reasoning, thinking, etc.)
  -> detectCategory() using 64 keyword patterns
  -> buildSystemPrompt() with model availability
  -> return structured prompt for Ollama
```

Key patterns:
- **5-minute cache TTL** for installed models
- **Cache invalidation** on MODEL_PULLED/MODEL_DELETED events
- **Category detection**: 28 coding, 21 reasoning, 15 thinking keywords

### MemoryExtractionManager (memory-service)

Extracts memories from completed messages:

```
extract(messagePayload)
  -> callOllama() with extraction prompt
  -> parseExtractedMemories() from Ollama response
  -> deduplicateMemories() against existing records
  -> storeNewMemories() in repository
  -> publishMemoryExtracted() events
```

### ImageGenerationManager (image-service)

Orchestrates the full image generation pipeline:

```
processGeneration(generationId)
  -> updateStatus(STARTING)
  -> selectAdapter() based on provider (DALL-E, Gemini, ComfyUI, SD)
  -> callAdapter.generate() with retry
  -> storeAssets() (download + store via file-service)
  -> updateStatus(COMPLETED)
  -> publishImageGenerated() event
  -> emitSSE() completion
```

### FileGenerationManager (file-generation-service)

Orchestrates file content generation and format conversion:

```
processGeneration(generationId)
  -> updateStatus(STARTING)
  -> generateContent() via LLM (GENERATING_CONTENT)
  -> convertToFormat() (CONVERTING) — PDF, DOCX, CSV, etc.
  -> storeAsset() (FINALIZING)
  -> updateStatus(COMPLETED)
  -> publishFileGenerated() event
  -> emitSSE() completion
```

---

## Manager Method Decomposition

When a method approaches 80 lines, decompose:

```typescript
// Main orchestration method (~30 lines)
async processGeneration(generationId: string): Promise<void> {
  const generation = await this.getAndValidate(generationId);
  await this.updateStatus(generationId, ImageGenerationStatus.STARTING);

  const adapter = this.selectAdapter(generation.provider);
  const result = await this.executeWithRetry(adapter, generation);

  await this.storeAssets(generationId, result);
  await this.finalizeGeneration(generationId, result);
}

// Private helpers (~15-25 lines each)
private async getAndValidate(id: string): Promise<ImageGeneration> { ... }
private selectAdapter(provider: string): ImageAdapter { ... }
private async executeWithRetry(adapter: ImageAdapter, gen: ImageGeneration): Promise<GenerationResult> { ... }
private async storeAssets(id: string, result: GenerationResult): Promise<void> { ... }
private async finalizeGeneration(id: string, result: GenerationResult): Promise<void> { ... }
```

---

## Error Handling in Managers

Managers must handle errors at each step and ensure the system remains consistent:

```typescript
async processGeneration(generationId: string): Promise<void> {
  try {
    // ... main flow ...
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    this.logger.error(`Generation ${generationId} failed: ${message}`);

    // Always store error state so frontend can display it
    await this.repository.updateStatus(generationId, {
      status: ImageGenerationStatus.FAILED,
      errorMessage: message,
    });

    // Emit SSE error so frontend reacts immediately
    this.eventsService.emit(generationId, {
      status: ImageGenerationStatus.FAILED,
      error: message,
    });

    // Publish failure event for audit
    await this.rabbitMQ.publish(EventPattern.IMAGE_FAILED, { ... });
  }
}
```

---

## Manager Registration

Managers are registered as providers in their module:

```typescript
@Module({
  providers: [
    ChatMessagesService,
    ChatExecutionManager,
    ContextAssemblyManager,
    ChatMessagesRepository,
  ],
  controllers: [ChatMessagesController],
})
export class ChatMessagesModule {}
```

---

## Service-to-Manager Delegation

Services delegate complex flows to managers:

```typescript
// In ChatMessagesService
async handleMessageRouted(payload: MessageRoutedPayload): Promise<void> {
  // Simple delegation — manager handles the complexity
  await this.executionManager.executeRouted(payload);
}
```
