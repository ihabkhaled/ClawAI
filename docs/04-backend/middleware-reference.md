# Middleware Reference

Reference for all guards, interceptors, pipes, filters, and decorators used across ClawAI services.

---

## NestJS Request Pipeline

```
Incoming Request
  -> Guards (AuthGuard, RolesGuard)
  -> Interceptors (LoggingInterceptor — before)
  -> Pipes (ZodValidationPipe)
  -> Controller Method
  -> Interceptors (LoggingInterceptor — after)
  -> Exception Filter (GlobalExceptionFilter — on error)
  -> Response
```

---

## Guards

### AuthGuard

**Package**: `@claw/shared-auth`
**Applied**: Globally on all services via `APP_GUARD`
**Purpose**: Validates JWT Bearer token and attaches user to request

```typescript
@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    // 1. Check for @Public() decorator — skip auth if present
    // 2. Extract Authorization header
    // 3. Validate "Bearer <token>" format
    // 4. Verify JWT with JWT_SECRET
    // 5. Attach { id, email, role } to request.user
    // 6. Throw UnauthorizedException on failure
  }
}
```

Bypass: Use `@Public()` decorator on endpoint or controller class.

Error responses:
- `401 "Missing authorization header"` — no Authorization header
- `401 "Invalid authorization header format"` — not Bearer format
- `401 "Missing token"` — empty token
- `401 "Authentication service misconfigured"` — JWT_SECRET not set
- `401 "Invalid or expired token"` — JWT verification failed

### RolesGuard

**Package**: `@claw/shared-auth`
**Applied**: Globally on all services via `APP_GUARD`
**Purpose**: Enforces role-based access control

```typescript
@Injectable()
export class RolesGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    // 1. Get required roles from @Roles() decorator
    // 2. If no roles specified, allow access
    // 3. Check if user's role is in required roles
    // 4. Return false (403 Forbidden) if not authorized
  }
}
```

Roles hierarchy: `ADMIN > OPERATOR > VIEWER` (no inheritance — must list explicitly).

Usage:
```typescript
@Roles(UserRole.ADMIN)  // Only admins
@Roles(UserRole.ADMIN, UserRole.OPERATOR)  // Admins and operators
// No @Roles() = any authenticated user
```

---

## Interceptors

### LoggingInterceptor

**Location**: `src/app/interceptors/logging.interceptor.ts` (in each service)
**Applied**: Globally
**Purpose**: Request/response logging with correlation IDs

```typescript
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    // Before request:
    // 1. Extract or generate X-Request-ID
    // 2. Extract or generate X-Trace-ID
    // 3. Set headers on request and response
    // 4. Record start time

    // After response:
    // 5. Log: method, url, statusCode, durationMs, requestId, traceId
  }
}
```

Log output format:
```
LoggingInterceptor - GET /api/v1/chat-threads 200 - 45ms
{requestId: "abc", traceId: "xyz", method: "GET", url: "/api/v1/chat-threads", statusCode: 200, durationMs: 45}
```

**Skipping**: Use `@SkipLogging()` decorator on SSE endpoints to prevent "Cannot set headers after they are sent" errors.

---

## Pipes

### ZodValidationPipe

**Location**: `src/app/pipes/zod-validation.pipe.ts` (in each service)
**Applied**: Per-endpoint via `@UsePipes()` or `@Body(new ZodValidationPipe(schema))`
**Purpose**: Validates and transforms request data using Zod schemas

```typescript
@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) {}

  transform(value: unknown, _metadata: ArgumentMetadata): unknown {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      throw new BadRequestException({
        message: 'Validation failed',
        errors,
      });
    }
    return result.data;  // Returns transformed data (defaults applied)
  }
}
```

Usage patterns:
```typescript
// Per-parameter
@Body(new ZodValidationPipe(createThreadSchema)) dto: CreateThreadDto

// Per-method
@UsePipes(new ZodValidationPipe(loginSchema))
async login(@Body() dto: LoginDto): Promise<LoginResult>
```

---

## Filters

### GlobalExceptionFilter

**Location**: `src/app/filters/global-exception.filter.ts` (in each service)
**Applied**: Globally in `main.ts`
**Purpose**: Catches all exceptions and returns consistent error responses

```typescript
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    // 1. BusinessException -> use code + message + status
    // 2. HttpException -> use status + message
    // 3. Error -> 500 + log stack trace
    // 4. Unknown -> 500 + log

    // Response body: { statusCode, message, code?, errors?, timestamp }
  }
}
```

---

## Decorators

### @Public()

**Package**: `@claw/shared-auth`
**Purpose**: Marks endpoint as publicly accessible (skips AuthGuard)

```typescript
@Public()
@Post('login')
async login(@Body() dto: LoginDto): Promise<LoginResult> { ... }
```

### @Roles(...roles)

**Package**: `@claw/shared-auth`
**Purpose**: Restricts endpoint to specific user roles

```typescript
@Roles(UserRole.ADMIN)
@Post()
async create(@Body() dto: CreateUserDto): Promise<SafeUser> { ... }
```

### @CurrentUser()

**Package**: `@claw/shared-auth`
**Purpose**: Extracts authenticated user from request

```typescript
async create(
  @CurrentUser() user: AuthenticatedUser,
  @Body() dto: CreateThreadDto,
): Promise<ChatThread> { ... }
```

Returns `AuthenticatedUser`: `{ id: string; email: string; role: UserRole }`

### @SkipLogging()

**Location**: `src/app/decorators/skip-logging.decorator.ts` (in services with SSE)
**Purpose**: Skips LoggingInterceptor for SSE endpoints

```typescript
@Sse('stream/:threadId')
@SkipLogging()
@SkipThrottle()
stream(@Param('threadId') threadId: string): Observable<MessageEvent> { ... }
```

### @SkipThrottle()

**Package**: `@nestjs/throttler`
**Purpose**: Exempts endpoint from rate limiting (for SSE long-lived connections)

---

## Global Registration

All middleware is registered globally in each service's `app.module.ts` and `main.ts`:

```typescript
// main.ts
app.useGlobalFilters(new GlobalExceptionFilter());

// app.module.ts
providers: [
  { provide: APP_GUARD, useClass: AuthGuard },
  { provide: APP_GUARD, useClass: RolesGuard },
  { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
],
```

Rate limiting is configured via `ThrottlerModule`:
```typescript
ThrottlerModule.forRoot([{
  ttl: config.throttleTtl,    // Default: 60000ms
  limit: config.throttleLimit, // Default: 100 requests
}]),
```

---

## Security Headers

All services use Helmet for security headers:

```typescript
app.use(helmet());
```

This sets:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: SAMEORIGIN`
- `X-XSS-Protection: 0`
- `Strict-Transport-Security`
- And other security headers

---

## CORS Configuration

```typescript
app.enableCors({
  origin: config.corsOrigins.split(','),
  credentials: true,
});
```

Default: `http://localhost:3000,http://localhost:80,http://localhost`

---

## pino-http Auto-Logging Exclusion

For services with SSE, pino-http autoLogging excludes SSE routes:

```typescript
autoLogging: {
  ignore: (req) => req.url?.includes('/stream/') ?? false,
}
```

This prevents the "Cannot set headers after they are sent" error.
