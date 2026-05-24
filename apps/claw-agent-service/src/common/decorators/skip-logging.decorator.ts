import { SetMetadata } from '@nestjs/common';

/**
 * V2 Stream 08 — sibling of the chat-service decorator. Tells the
 * LoggingInterceptor / pino-http to skip auto-logging for this handler.
 * MUST be applied to every `@Sse(...)` controller method per the
 * gotcha documented in CLAUDE.md ("SSE Streaming" section).
 */
export const SKIP_LOGGING_KEY = 'skipLogging';
export const SkipLogging = (): MethodDecorator & ClassDecorator =>
  SetMetadata(SKIP_LOGGING_KEY, true);
