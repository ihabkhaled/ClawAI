# Pattern: Fire-and-Forget with Error Storage

> Used in every background manager that makes async AI/LLM calls. Critical for ensuring frontend never spins forever when a background job fails.

## Problem

Background jobs (triggered by RabbitMQ events, not HTTP requests) cannot return an error to the caller via HTTP response. If they fail silently, the frontend polls forever waiting for an ASSISTANT message that never comes.

## The Rules

1. **Always store an error record** when a background job fails
2. **Always emit an SSE error event** before storing (for immediate frontend feedback)
3. **Both operations wrapped in separate try-catch** (don't let SSE failure prevent DB storage)
4. The error message must be an ASSISTANT record with `metadata: { error: true }` so the frontend's polling stop condition (`lastMessage.role === ASSISTANT`) is satisfied

## Implementation Pattern

```typescript
// In a manager's fire-and-forget method:
async executeWithFallback(payload: ExecutionPayload): Promise<void> {
  try {
    const result = await this.callProvider(payload);
    await this.storeAssistantMessage(payload.threadId, result);
    await this.emitCompletion(payload.threadId, result);
  } catch (error: unknown) {
    this.logger.error(`executeWithFallback failed: ${String(error)}`);

    // Step 1: Emit SSE error (immediate frontend feedback)
    try {
      this.sseService.emitError(payload.threadId, 'Failed to get AI response');
    } catch (sseError: unknown) {
      this.logger.warn(`Failed to emit SSE error: ${String(sseError)}`);
      // Do NOT re-throw — proceed to DB storage
    }

    // Step 2: Store error record (polling fallback)
    try {
      await this.messagesRepository.create({
        threadId: payload.threadId,
        role: MessageRole.ASSISTANT,
        content: 'An error occurred while processing your request.',
        metadata: { error: true, errorMessage: String(error) },
      });
    } catch (dbError: unknown) {
      this.logger.error(`Failed to store error message: ${String(dbError)}`);
      // Do NOT re-throw — log and move on
    }
  }
}
```

## Frontend Stop Condition

The frontend poll hook MUST check for error records:

```typescript
// In poll hook:
const lastMessage = messages[messages.length - 1];

const shouldStopPolling =
  lastMessage?.role === MessageRole.ASSISTANT || // Success
  lastMessage?.metadata?.error === true || // Error stored by manager
  pollCount >= MAX_POLLS; // Timeout safety net
```

Without `metadata?.error === true`, an error ASSISTANT record still stops polling (since role=ASSISTANT), but the UI might show a confusing empty response rather than an error message.

## Where Applied

| Manager                         | Operation            | Error stored as                           |
| ------------------------------- | -------------------- | ----------------------------------------- |
| `chat-execution.manager.ts`     | All LLM calls        | ASSISTANT message with `{ error: true }`  |
| `parallel-execution.manager.ts` | Parallel model calls | Per-model ASSISTANT with error            |
| `pipeline.manager.ts`           | Pipeline stages      | ASSISTANT with stage-specific error       |
| `image-execution.manager.ts`    | Image generation     | Image record with FAILED status + event   |
| `file-execution.manager.ts`     | File export          | FileGeneration with FAILED status + event |
| `memory-extraction.manager.ts`  | Memory extraction    | Logged only (not user-visible)            |

## Anti-Patterns to Avoid

```typescript
// WRONG: Error swallowed, frontend polls forever
try {
  await this.callProvider(payload);
} catch {
  this.logger.error('Provider failed');
  // No SSE emit, no DB storage → frontend spins
}

// WRONG: Single try-catch means SSE error prevents DB write
try {
  this.emitError(threadId, 'Failed');
  await this.storeErrorMessage(threadId);
} catch {
  // If emitError throws, storeErrorMessage is never called
}

// WRONG: Using ! non-null assertion in error path
const message = lastMessage!.metadata!.error; // Crashes if metadata null
```
