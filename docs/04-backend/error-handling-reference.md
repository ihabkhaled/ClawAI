# Error Handling Reference

Complete reference for error handling patterns across all ClawAI backend services.

---

## Exception Hierarchy

```
Error
  └── HttpException (NestJS)
        ├── UnauthorizedException (401)
        ├── BadRequestException (400)
        └── BusinessException (custom)
              ├── EntityNotFoundException (404)
              ├── DuplicateEntityException (409)
              ├── InvalidCredentialsException (401)
              ├── AccountSuspendedException (403)
              └── InvalidRefreshTokenException (401)
```

---

## BusinessException

Base exception for all domain-specific errors. Every error has a machine-readable `code` string.

```typescript
export class BusinessException extends HttpException {
  public readonly code: string;

  constructor(
    message: string,
    code: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
  ) {
    super({ message, code, statusCode: status }, status);
    this.code = code;
  }
}
```

Usage:
```typescript
throw new BusinessException(
  'Cannot delete active connector',
  'CONNECTOR_ACTIVE',
  HttpStatus.CONFLICT,
);
```

---

## Specialized Exceptions

### EntityNotFoundException

```typescript
export class EntityNotFoundException extends BusinessException {
  constructor(entity: string, id: string) {
    super(
      `${entity} with id '${id}' not found`,
      'ENTITY_NOT_FOUND',
      HttpStatus.NOT_FOUND,
    );
  }
}

// Usage
throw new EntityNotFoundException('ChatThread', threadId);
```

### DuplicateEntityException

```typescript
export class DuplicateEntityException extends BusinessException {
  constructor(entity: string, field: string) {
    super(
      `${entity} with this ${field} already exists`,
      'DUPLICATE_ENTITY',
      HttpStatus.CONFLICT,
    );
  }
}

// Usage
throw new DuplicateEntityException('User', 'email');
```

### InvalidCredentialsException

```typescript
// Usage — login with wrong email/password
throw new InvalidCredentialsException();
// Response: 401 { code: "INVALID_CREDENTIALS", message: "Invalid email or password" }
```

### AccountSuspendedException

```typescript
// Usage — suspended user tries to login
throw new AccountSuspendedException();
// Response: 403 { code: "ACCOUNT_SUSPENDED", message: "Account is suspended" }
```

### InvalidRefreshTokenException

```typescript
// Usage — expired or revoked refresh token
throw new InvalidRefreshTokenException();
// Response: 401 { code: "INVALID_REFRESH_TOKEN", message: "Invalid or expired refresh token" }
```

---

## GlobalExceptionFilter

Catches ALL exceptions and formats them into a consistent response:

```typescript
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = ctx.getResponse<Response>();

    // 1. BusinessException → use code + message + status
    // 2. HttpException → use status + message
    // 3. Error → 500 Internal Server Error (logged)
    // 4. Unknown → 500 Internal Server Error (logged)

    response.status(status).json(body);
  }
}
```

### Response Format

All error responses follow this structure:

```json
{
  "statusCode": 404,
  "message": "ChatThread with id 'abc123' not found",
  "code": "ENTITY_NOT_FOUND",
  "timestamp": "2026-04-11T10:00:00.000Z"
}
```

For validation errors (from ZodValidationPipe):
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [
    { "field": "email", "message": "Invalid email" },
    { "field": "password", "message": "String must contain at least 8 character(s)" }
  ],
  "timestamp": "2026-04-11T10:00:00.000Z"
}
```

---

## Error Code Catalog

| Code | HTTP Status | Description | Service |
|------|-------------|-------------|---------|
| `ENTITY_NOT_FOUND` | 404 | Resource does not exist | All |
| `DUPLICATE_ENTITY` | 409 | Unique constraint violation | auth, connector |
| `INVALID_CREDENTIALS` | 401 | Wrong email/password | auth |
| `ACCOUNT_SUSPENDED` | 403 | Account is suspended | auth |
| `INVALID_REFRESH_TOKEN` | 401 | Expired/revoked token | auth |
| `FORBIDDEN` | 403 | User does not own resource | chat, memory, file |
| `CONNECTOR_ACTIVE` | 409 | Cannot delete active connector | connector |
| `CONNECTOR_UNHEALTHY` | 502 | Provider health check failed | connector |
| `PROVIDER_NOT_FOUND` | 404 | No connector for provider | connector, routing |
| `MODEL_NOT_FOUND` | 404 | Model not in connector | connector, ollama |
| `ROUTING_FAILED` | 500 | All routing strategies failed | routing |
| `OLLAMA_UNAVAILABLE` | 503 | Ollama runtime unreachable | ollama, routing |
| `PULL_IN_PROGRESS` | 409 | Model already being pulled | ollama |
| `GENERATION_FAILED` | 500 | Image/file generation failed | image, file-gen |
| `GENERATION_TIMED_OUT` | 504 | Generation exceeded timeout | image, file-gen |
| `UNSUPPORTED_FORMAT` | 400 | File format not supported | file, file-gen |

---

## Layer-Specific Error Rules

### Controllers
- **NO try/catch** — exceptions bubble up to GlobalExceptionFilter
- **NO throw** — validation handled by ZodValidationPipe, business logic in services

### Services
- **Throw BusinessException** for domain errors
- **Throw EntityNotFoundException** when a resource is not found
- **NEVER swallow errors** — always log and rethrow or handle explicitly
- **Validate ownership** before operations — throw FORBIDDEN if not owner

### Repositories
- **NO throw** — return null for not-found, let services decide
- If Prisma throws (e.g., unique constraint), it bubbles up to GlobalExceptionFilter

### Managers
- **Catch and handle** within try/catch blocks
- **Store error state** in database so frontend can display it
- **Emit SSE error events** for real-time feedback
- **Publish failure events** for audit logging
- **Re-throw** after handling if the caller needs to know

---

## Async Error Handling

For async flows (RabbitMQ event handlers), errors must be handled differently since there is no HTTP response:

```typescript
async handleMessageCreated(payload: MessageCreatedPayload): Promise<void> {
  try {
    await this.routingManager.route(payload);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    this.logger.error(`Routing failed for message ${payload.messageId}: ${message}`);

    // Store error message so frontend polling finds it
    await this.messageRepository.create({
      threadId: payload.threadId,
      role: MessageRole.ASSISTANT,
      content: `Error: ${message}`,
      metadata: { error: true },
    });

    // Emit SSE error
    this.streamService.emit(payload.threadId, {
      type: 'error',
      error: message,
    });
  }
}
```

---

## SSE Error Handling

SSE endpoints require special error handling because headers may already be sent:

1. Use `@SkipLogging()` to prevent pino-http conflicts
2. GlobalExceptionFilter checks `response.headersSent` before writing
3. SSE errors are emitted as data events, not HTTP error responses

---

## Unhandled Exception Logging

The GlobalExceptionFilter logs unhandled exceptions with stack traces:

```typescript
} else if (exception instanceof Error) {
  this.logger.error(`Unhandled exception: ${exception.message}`, exception.stack);
}
```

These are internal server errors (500) that should be investigated and fixed.
