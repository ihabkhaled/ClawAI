# ClawAI Error Catalog

This document catalogs all error codes, HTTP status mappings, response formats, client-side handling patterns, and retry guidance for the ClawAI platform.

---

## Error Response Format

All errors from ClawAI backend services follow a consistent JSON structure:

```json
{
  "statusCode": 400,
  "message": "Human-readable error description",
  "code": "MACHINE_READABLE_ERROR_CODE",
  "timestamp": "2026-04-09T10:30:00.000Z"
}
```

**Validation errors** include an additional `errors` array:

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "code": "VALIDATION_ERROR",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email address"
    },
    {
      "field": "password",
      "message": "Password is required"
    }
  ],
  "timestamp": "2026-04-09T10:30:00.000Z"
}
```

---

## Exception Class Hierarchy

All business errors extend from `BusinessException`, which extends NestJS `HttpException`:

```
HttpException (NestJS)
  └── BusinessException (base class, code + message + status)
        ├── EntityNotFoundException (404, "ENTITY_NOT_FOUND")
        ├── DuplicateEntityException (409, "DUPLICATE_ENTITY")
        ├── InvalidCredentialsException (401, "INVALID_CREDENTIALS")
        ├── AccountSuspendedException (403, "ACCOUNT_SUSPENDED")
        └── InvalidRefreshTokenException (401, "INVALID_REFRESH_TOKEN")
```

Custom `BusinessException` instances are thrown with specific `code` strings throughout the service layer.

---

## Error Code Catalog

### Authentication Errors

| Code                  | HTTP Status      | Message                          | Service      | Description                                          |
| --------------------- | ---------------- | -------------------------------- | ------------ | ---------------------------------------------------- |
| INVALID_CREDENTIALS   | 401 Unauthorized | Invalid email or password        | auth-service | Login attempt with incorrect email or password       |
| ACCOUNT_SUSPENDED     | 403 Forbidden    | Account is suspended             | auth-service | Login attempt on a suspended user account            |
| INVALID_REFRESH_TOKEN | 401 Unauthorized | Invalid or expired refresh token | auth-service | Refresh token is expired, revoked, or does not exist |

**Thrown by:** `AuthManager.login()`, `AuthManager.refresh()`

---

### User Management Errors

| Code                     | HTTP Status     | Message                                             | Service      | Description                                                          |
| ------------------------ | --------------- | --------------------------------------------------- | ------------ | -------------------------------------------------------------------- |
| DUPLICATE_ENTITY         | 409 Conflict    | User with this email already exists                 | auth-service | Attempting to create a user with an email that is already registered |
| ENTITY_NOT_FOUND         | 404 Not Found   | User with id '{id}' not found                       | auth-service | Referenced user ID does not exist                                    |
| INVALID_CURRENT_PASSWORD | 400 Bad Request | Current password is incorrect                       | auth-service | Password change with wrong current password                          |
| SAME_PASSWORD_ERROR      | 400 Bad Request | New password cannot be the same as current password | auth-service | Attempting to change password to the same value                      |

**Thrown by:** `UsersService.create()`, `UsersService.findById()`, `UsersService.changePassword()`

---

### Chat Thread Errors

| Code                    | HTTP Status   | Message                             | Service      | Description                                        |
| ----------------------- | ------------- | ----------------------------------- | ------------ | -------------------------------------------------- |
| ENTITY_NOT_FOUND        | 404 Not Found | ChatThread with id '{id}' not found | chat-service | Referenced thread ID does not exist                |
| FORBIDDEN_THREAD_ACCESS | 403 Forbidden | Access to this thread is forbidden  | chat-service | User attempting to access a thread they do not own |

**Thrown by:** `ChatThreadsService.getThread()`, `ChatThreadsService.updateThread()`, `ChatThreadsService.deleteThread()`

---

### Chat Message Errors

| Code                          | HTTP Status     | Message                                                  | Service      | Description                                                                   |
| ----------------------------- | --------------- | -------------------------------------------------------- | ------------ | ----------------------------------------------------------------------------- |
| ENTITY_NOT_FOUND              | 404 Not Found   | ChatMessage with id '{id}' not found                     | chat-service | Referenced message ID does not exist                                          |
| ENTITY_NOT_FOUND              | 404 Not Found   | ChatThread with id '{id}' not found                      | chat-service | Thread referenced by the message does not exist                               |
| FORBIDDEN_THREAD_ACCESS       | 403 Forbidden   | Access to this thread is forbidden                       | chat-service | User does not own the thread containing the message                           |
| LLM_EXECUTION_FAILED          | 400 Bad Request | All LLM providers failed to generate a response          | chat-service | Every provider in the fallback chain failed                                   |
| OLLAMA_REQUEST_FAILED         | 400 Bad Request | Ollama service returned status {status}                  | chat-service | The local Ollama service returned an error                                    |
| CLOUD_PROVIDER_REQUEST_FAILED | 400 Bad Request | Cloud provider {provider} returned status {status}       | chat-service | A cloud AI provider returned an HTTP error                                    |
| CLOUD_PROVIDER_EMPTY_RESPONSE | 400 Bad Request | Cloud provider {provider} returned no choices            | chat-service | The provider responded successfully but with no content                       |
| MISSING_PROVIDER_BASE_URL     | 400 Bad Request | No base URL configured for provider {provider}           | chat-service | The connector for this provider has no base URL set                           |
| MISSING_PROVIDER_API_KEY      | 400 Bad Request | No API key configured for provider {provider}            | chat-service | The connector for this provider has no API key                                |
| CONNECTOR_CONFIG_FETCH_FAILED | 400 Bad Request | Failed to fetch connector config for provider {provider} | chat-service | The chat service could not reach the connector service to get API credentials |
| IMAGE_SERVICE_REQUEST_FAILED  | 400 Bad Request | Image service returned status {status}                   | chat-service | The image generation service returned an error                                |

**Thrown by:** `ChatMessagesService`, `ChatExecutionManager`

---

### Connector Errors

| Code             | HTTP Status   | Message                            | Service           | Description                            |
| ---------------- | ------------- | ---------------------------------- | ----------------- | -------------------------------------- |
| ENTITY_NOT_FOUND | 404 Not Found | Connector with id '{id}' not found | connector-service | Referenced connector ID does not exist |

**Thrown by:** `ConnectorsService.getConnector()`, `ConnectorsService.updateConnector()`, `ConnectorsService.deleteConnector()`, `ConnectorsService.testConnector()`, `ConnectorsService.syncModels()`

---

### Routing Errors

| Code             | HTTP Status   | Message                                | Service         | Description                                 |
| ---------------- | ------------- | -------------------------------------- | --------------- | ------------------------------------------- |
| ENTITY_NOT_FOUND | 404 Not Found | RoutingPolicy with id '{id}' not found | routing-service | Referenced routing policy ID does not exist |

**Thrown by:** `RoutingService.getPolicy()`, `RoutingService.updatePolicy()`, `RoutingService.deletePolicy()`

---

### Memory Errors

| Code                    | HTTP Status   | Message                               | Service        | Description                                        |
| ----------------------- | ------------- | ------------------------------------- | -------------- | -------------------------------------------------- |
| ENTITY_NOT_FOUND        | 404 Not Found | MemoryRecord with id '{id}' not found | memory-service | Referenced memory record ID does not exist         |
| FORBIDDEN_MEMORY_ACCESS | 403 Forbidden | Access to this memory is forbidden    | memory-service | User attempting to access a memory they do not own |

**Thrown by:** `MemoryService.getMemory()`, `MemoryService.updateMemory()`, `MemoryService.deleteMemory()`, `MemoryService.toggleMemory()`

---

### Context Pack Errors

| Code                          | HTTP Status   | Message                                  | Service        | Description                                              |
| ----------------------------- | ------------- | ---------------------------------------- | -------------- | -------------------------------------------------------- |
| ENTITY_NOT_FOUND              | 404 Not Found | ContextPack with id '{id}' not found     | memory-service | Referenced context pack ID does not exist                |
| FORBIDDEN_CONTEXT_PACK_ACCESS | 403 Forbidden | Access to this context pack is forbidden | memory-service | User attempting to access a context pack they do not own |

**Thrown by:** `ContextPacksService.getContextPack()`, `ContextPacksService.updateContextPack()`, `ContextPacksService.deleteContextPack()`, `ContextPacksService.addItem()`, `ContextPacksService.removeItem()`

---

### File Errors

| Code                  | HTTP Status     | Message                                                | Service      | Description                                      |
| --------------------- | --------------- | ------------------------------------------------------ | ------------ | ------------------------------------------------ |
| ENTITY_NOT_FOUND      | 404 Not Found   | File with id '{id}' not found                          | file-service | Referenced file ID does not exist                |
| FORBIDDEN_FILE_ACCESS | 403 Forbidden   | Access to this file is forbidden                       | file-service | User attempting to access a file they do not own |
| INVALID_MIME_TYPE     | 400 Bad Request | MIME type '{type}' is not allowed                      | file-service | File upload with an unsupported MIME type        |
| FILE_TOO_LARGE        | 400 Bad Request | File size {size} exceeds maximum of {max} bytes (50MB) | file-service | Uploaded file exceeds the 50MB size limit        |

**Thrown by:** `FilesService.uploadFile()`, `FilesService.getFile()`, `FilesService.deleteFile()`, `FilesService.downloadFile()`, `FilesService.getChunks()`

---

### Ollama Errors

| Code             | HTTP Status   | Message                             | Service        | Description                                                                     |
| ---------------- | ------------- | ----------------------------------- | -------------- | ------------------------------------------------------------------------------- |
| ENTITY_NOT_FOUND | 404 Not Found | LocalModel with id '{id}' not found | ollama-service | Referenced local model ID does not exist (e.g., invalid modelId in assign-role) |

**Thrown by:** `OllamaService.assignRole()`

---

### Image Generation Errors

| Code                          | HTTP Status     | Message                                  | Service       | Description                                                               |
| ----------------------------- | --------------- | ---------------------------------------- | ------------- | ------------------------------------------------------------------------- |
| IMAGE_NOT_FOUND               | 400 Bad Request | Image generation not found               | image-service | Referenced image generation ID does not exist or is not owned by the user |
| NO_ALTERNATE_MODEL            | 400 Bad Request | No alternate image model available       | image-service | Retry-alternate requested but no other image model is configured          |
| UNSUPPORTED_IMAGE_PROVIDER    | 400 Bad Request | Unsupported image provider: {provider}   | image-service | The specified provider does not support image generation                  |
| LOCAL_IMAGE_GENERATION_FAILED | 400 Bad Request | Local image generation failed: {details} | image-service | Stable Diffusion or local image generation runtime error                  |

**Thrown by:** `ImageGenerationService`, `ImageExecutionManager`

---

### File Generation Errors

| Code                      | HTTP Status     | Message                   | Service                 | Description                                                              |
| ------------------------- | --------------- | ------------------------- | ----------------------- | ------------------------------------------------------------------------ |
| FILE_GENERATION_NOT_FOUND | 400 Bad Request | File generation not found | file-generation-service | Referenced file generation ID does not exist or is not owned by the user |

**Thrown by:** `FileGenerationService.getByIdForUser()`, `FileGenerationService.retryGeneration()`

---

### Validation Errors (Zod)

| Code             | HTTP Status     | Message           | Service      | Description                                                   |
| ---------------- | --------------- | ----------------- | ------------ | ------------------------------------------------------------- |
| VALIDATION_ERROR | 400 Bad Request | Validation failed | All services | Request body or query parameters failed Zod schema validation |

Validation errors are produced by the `ZodValidationPipe` and include field-level error details. Common validation failures include:

| Field          | Typical Validation Error                                                   |
| -------------- | -------------------------------------------------------------------------- |
| email          | "Invalid email address"                                                    |
| password       | "Password is required"                                                     |
| content        | "Content must not be empty" or "Content must be at most 100000 characters" |
| title          | "Title must be at most 255 characters"                                     |
| temperature    | "Number must be less than or equal to 2"                                   |
| maxTokens      | "Number must be less than or equal to 32000"                               |
| fileIds        | "Maximum 10 files per message"                                             |
| contextPackIds | "Maximum 10 context packs"                                                 |
| name           | "Name is required" or "Name must be at most 100 characters"                |
| priority       | "Number must be less than or equal to 1000"                                |
| apiKey         | "API key must be at most 500 characters"                                   |
| prompt         | "String must contain at least 1 character(s)"                              |
| width/height   | "Number must be greater than or equal to 256"                              |

---

### Framework and Infrastructure Errors

| HTTP Status               | Description                     | Typical Cause                                                                               |
| ------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------- |
| 401 Unauthorized          | Missing or invalid JWT          | No Authorization header, expired token, or malformed token                                  |
| 403 Forbidden             | Insufficient permissions        | User role does not have access to the endpoint (e.g., OPERATOR calling ADMIN-only endpoint) |
| 404 Not Found             | Route not found                 | Invalid API path; check the route map in the Nginx configuration                            |
| 405 Method Not Allowed    | HTTP method not supported       | Using GET on a POST-only endpoint, etc.                                                     |
| 429 Too Many Requests     | Rate limit exceeded             | Exceeded the throttle limit (default: 100 requests per minute per IP)                       |
| 500 Internal Server Error | Unhandled exception             | Unexpected server error; check server logs for stack trace                                  |
| 502 Bad Gateway           | Service unavailable via Nginx   | The target backend service is not running or not responding                                 |
| 503 Service Unavailable   | Service temporarily unavailable | Service is starting up, shutting down, or under heavy load                                  |
| 504 Gateway Timeout       | Request timed out via Nginx     | The backend service took too long to respond                                                |

---

## HTTP Status Code Summary

| Status                    | Used For                                                                 |
| ------------------------- | ------------------------------------------------------------------------ |
| 200 OK                    | Successful GET, PATCH, DELETE, and some POST operations                  |
| 201 Created               | Successful resource creation (POST)                                      |
| 204 No Content            | Successful operation with no response body (logout, password change)     |
| 400 Bad Request           | Validation errors, business logic errors (default for BusinessException) |
| 401 Unauthorized          | Authentication required or authentication failed                         |
| 403 Forbidden             | Authenticated but insufficient permissions or resource ownership         |
| 404 Not Found             | Resource does not exist                                                  |
| 409 Conflict              | Duplicate resource (unique constraint violation)                         |
| 429 Too Many Requests     | Rate limit exceeded                                                      |
| 500 Internal Server Error | Unhandled server error                                                   |

---

## Client-Side Error Handling Patterns

### Global Error Interceptor

The frontend should implement a global response interceptor (e.g., via Axios or fetch wrapper) that handles common error codes:

```
1. Check response.ok (or status >= 400)
2. Parse the error response body as JSON
3. Switch on statusCode:
   - 401: Clear auth state, redirect to login (unless the request was login or refresh)
   - 403: Show "Access Denied" toast notification
   - 404: Show "Not Found" message or redirect to 404 page
   - 409: Show "Already Exists" message with the conflicting field
   - 429: Show "Too Many Requests" message, suggest waiting
   - 400: Display the error message from the response body
   - 500+: Show generic "Server Error" message, log to client-logs service
4. If the error has a `code` field, use it for precise handling (see table below)
```

### Code-Specific Handling

| Error Code                    | Client Action                                                                             |
| ----------------------------- | ----------------------------------------------------------------------------------------- |
| INVALID_CREDENTIALS           | Show "Invalid email or password" on the login form                                        |
| ACCOUNT_SUSPENDED             | Show "Your account has been suspended. Contact an administrator."                         |
| INVALID_REFRESH_TOKEN         | Clear all tokens, redirect to login page                                                  |
| ENTITY_NOT_FOUND              | Show "The requested item was not found" or remove it from the local cache                 |
| DUPLICATE_ENTITY              | Show "A record with this {field} already exists" on the form                              |
| FORBIDDEN_THREAD_ACCESS       | Show "You do not have access to this thread" and redirect to the threads list             |
| FORBIDDEN_MEMORY_ACCESS       | Show "You do not have access to this memory" and redirect to the memories list            |
| FORBIDDEN_CONTEXT_PACK_ACCESS | Show "You do not have access to this context pack"                                        |
| FORBIDDEN_FILE_ACCESS         | Show "You do not have access to this file"                                                |
| LLM_EXECUTION_FAILED          | Show "Failed to generate a response. All providers were unavailable." with a retry button |
| OLLAMA_REQUEST_FAILED         | Show "Local AI service is unavailable" with suggestion to check Ollama health             |
| CLOUD_PROVIDER_REQUEST_FAILED | Show "The AI provider returned an error. Try again or select a different model."          |
| CLOUD_PROVIDER_EMPTY_RESPONSE | Show "The AI provider returned an empty response. Try regenerating."                      |
| CONNECTOR_CONFIG_FETCH_FAILED | Show "Could not load provider configuration. Check connector settings."                   |
| MISSING_PROVIDER_BASE_URL     | Show "Provider not fully configured. Contact an administrator."                           |
| MISSING_PROVIDER_API_KEY      | Show "Provider API key is missing. Contact an administrator."                             |
| INVALID_MIME_TYPE             | Show "This file type is not supported" with a list of allowed types                       |
| FILE_TOO_LARGE                | Show "File exceeds the 50MB limit. Please use a smaller file."                            |
| IMAGE_NOT_FOUND               | Show "Image generation not found" and redirect to the images list                         |
| NO_ALTERNATE_MODEL            | Show "No alternate image model is available. Configure additional connectors."            |
| UNSUPPORTED_IMAGE_PROVIDER    | Show "This provider does not support image generation."                                   |
| LOCAL_IMAGE_GENERATION_FAILED | Show "Local image generation failed. Try a cloud provider instead."                       |
| FILE_GENERATION_NOT_FOUND     | Show "File generation not found"                                                          |
| INVALID_CURRENT_PASSWORD      | Show "Current password is incorrect" on the password change form                          |
| SAME_PASSWORD_ERROR           | Show "New password must be different from current password"                               |
| VALIDATION_ERROR              | Display field-level errors next to the corresponding form inputs                          |

### Token Refresh Flow

```
1. Make API request with access token
2. If 401 response:
   a. Attempt token refresh using the stored refresh token
   b. If refresh succeeds: retry the original request with the new access token
   c. If refresh fails (INVALID_REFRESH_TOKEN): clear auth state, redirect to login
3. Implement a refresh lock to prevent multiple simultaneous refresh requests
```

---

## Retry Guidance

### Retryable Errors

| Error Code                    | Retryable | Strategy                                  | Max Retries               | Backoff                                      |
| ----------------------------- | --------- | ----------------------------------------- | ------------------------- | -------------------------------------------- |
| LLM_EXECUTION_FAILED          | Yes       | User-initiated retry (regenerate button)  | No automatic limit        | Manual                                       |
| OLLAMA_REQUEST_FAILED         | Yes       | Automatic with backoff                    | 3                         | Exponential (1s, 2s, 4s)                     |
| CLOUD_PROVIDER_REQUEST_FAILED | Yes       | Automatic fallback chain, then user retry | Built into fallback chain | N/A                                          |
| CLOUD_PROVIDER_EMPTY_RESPONSE | Yes       | User-initiated regenerate                 | No automatic limit        | Manual                                       |
| CONNECTOR_CONFIG_FETCH_FAILED | Yes       | Automatic with backoff                    | 2                         | Linear (1s, 2s)                              |
| IMAGE_SERVICE_REQUEST_FAILED  | Yes       | User-initiated retry                      | No automatic limit        | Manual                                       |
| LOCAL_IMAGE_GENERATION_FAILED | Yes       | User-initiated retry or alternate         | No automatic limit        | Manual                                       |
| 429 Too Many Requests         | Yes       | Automatic with backoff                    | 3                         | Respect Retry-After header, else exponential |
| 500 Internal Server Error     | Yes       | Automatic with backoff                    | 2                         | Exponential (1s, 2s)                         |
| 502 Bad Gateway               | Yes       | Automatic with backoff                    | 3                         | Exponential (2s, 4s, 8s)                     |
| 503 Service Unavailable       | Yes       | Automatic with backoff                    | 3                         | Exponential (2s, 4s, 8s)                     |
| 504 Gateway Timeout           | Yes       | Automatic with backoff                    | 2                         | Exponential (5s, 10s)                        |

### Non-Retryable Errors

| Error Code                 | Reason                                                                |
| -------------------------- | --------------------------------------------------------------------- |
| INVALID_CREDENTIALS        | User must correct their credentials                                   |
| ACCOUNT_SUSPENDED          | Administrative action required                                        |
| INVALID_REFRESH_TOKEN      | Session expired; must re-authenticate                                 |
| ENTITY_NOT_FOUND           | Resource does not exist; retrying will not help                       |
| DUPLICATE_ENTITY           | Unique constraint violation; must use different data                  |
| FORBIDDEN\_\*              | Permission issue; retrying will not help                              |
| INVALID_MIME_TYPE          | File type not supported; must convert the file                        |
| FILE_TOO_LARGE             | File is too large; must reduce size                                   |
| MISSING_PROVIDER_BASE_URL  | Configuration issue; requires admin action                            |
| MISSING_PROVIDER_API_KEY   | Configuration issue; requires admin action                            |
| NO_ALTERNATE_MODEL         | No other model available; requires additional connector configuration |
| UNSUPPORTED_IMAGE_PROVIDER | Provider does not support the operation                               |
| INVALID_CURRENT_PASSWORD   | User must enter the correct current password                          |
| SAME_PASSWORD_ERROR        | User must choose a different password                                 |
| VALIDATION_ERROR           | User must correct the input data                                      |

### RabbitMQ Event Processing Retries

Events consumed from the RabbitMQ `claw.events` exchange use the following retry strategy:

- **Max retries:** 3
- **Backoff:** Exponential with jitter
- **Dead Letter Queue (DLQ):** Events that fail all retries are sent to a DLQ for manual investigation
- **Affected events:** message.created, message.routed, message.completed, connector.synced, connector.health_checked, routing.decision_made, memory.extracted, user.login, user.logout

---

## Error Monitoring and Alerting

### Server-Side

- All `BusinessException` instances are caught by the `GlobalExceptionFilter` and logged with the error code, message, and stack trace.
- 500-level errors are logged at ERROR level and should trigger alerts.
- Error patterns visible in server logs: filter by `level=ERROR` in the server logs viewer.

### Client-Side

- Frontend errors are sent to the client-logs service via POST /api/v1/client-logs.
- Error logs include component name, action, user ID, route, and user agent for debugging.
- Client log statistics (GET /api/v1/client-logs/stats) show error rate trends.

### Key Metrics to Monitor

| Metric                             | Source                  | Alert Threshold                                              |
| ---------------------------------- | ----------------------- | ------------------------------------------------------------ |
| LLM_EXECUTION_FAILED rate          | Server logs, audit logs | > 5% of message requests                                     |
| CONNECTOR_CONFIG_FETCH_FAILED rate | Server logs             | Any occurrence (indicates service communication failure)     |
| 429 rate                           | Nginx logs              | > 10% of requests (throttle limits may need adjustment)      |
| 500 error rate                     | Server logs             | > 1% of requests                                             |
| INVALID_CREDENTIALS rate           | Audit logs (user.login) | > 10 failed logins per minute per IP (brute force indicator) |
| Refresh token failures             | Auth service logs       | Sudden spike may indicate token store corruption             |
