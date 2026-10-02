import { UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import jwt from 'jsonwebtoken';
import { vi } from 'vitest';

import { AppConfig } from '../../config/app.config';
import { AuthGuard } from '../auth.guard';
import { OllamaController } from '../../../modules/ollama/ollama.controller';
import { OllamaInternalController } from '../../../modules/ollama/ollama-internal.controller';

// Importing the real controllers loads module-level AppConfig reads; give the
// schema the required values before any import runs.
vi.hoisted(() => {
  process.env['OLLAMA_DATABASE_URL'] = 'postgresql://test/test';
  process.env['OLLAMA_BASE_URL'] = 'http://ollama:11434';
  process.env['REDIS_URL'] = 'redis://redis:6379';
  process.env['RABBITMQ_URL'] = 'amqp://rabbitmq:5672';
  process.env['JWT_SECRET'] = 's'.repeat(40);
});

const JWT_SECRET = 's'.repeat(40);
const SERVICE_TOKEN = 't'.repeat(40);

type Handler = (...args: never[]) => unknown;

const contextFor = (
  handler: Handler,
  controller: abstract new (...args: never[]) => unknown,
  authorization?: string,
): { context: never; request: { headers: Record<string, string>; user?: unknown } } => {
  const request: { headers: Record<string, string>; user?: unknown } = {
    headers: authorization === undefined ? {} : { authorization },
  };
  const context = {
    getHandler: () => handler,
    getClass: () => controller,
    switchToHttp: () => ({ getRequest: () => request }),
  } as never;
  return { context, request };
};

const userJwt = (): string =>
  jwt.sign({ sub: 'user-1', email: 'u@claw.local', role: 'USER' }, JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: 60,
  });

const generate = OllamaController.prototype.generate as Handler;
const chat = OllamaController.prototype.chat as Handler;
const pullModel = OllamaController.prototype.pullModel as Handler;
const health = OllamaController.prototype.healthCheck as Handler;

describe('AuthGuard — ollama inference (ADR-144)', () => {
  const guard = new AuthGuard(new Reflector());

  beforeEach(() => {
    vi.spyOn(AppConfig, 'get').mockReturnValue({
      JWT_SECRET,
      INTER_SERVICE_AUTH_TOKEN: SERVICE_TOKEN,
    } as never);
  });

  it.each([
    ['generate', generate],
    ['chat', chat],
  ])('refuses an anonymous %s call with 401', (_name, handler) => {
    const { context } = contextFor(handler, OllamaController);
    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it.each([
    ['generate', generate],
    ['chat', chat],
  ])('accepts a user JWT on %s and sets request.user', (_name, handler) => {
    const { context, request } = contextFor(handler, OllamaController, `Bearer ${userJwt()}`);
    expect(guard.canActivate(context)).toBe(true);
    expect(request.user).toEqual({ id: 'user-1', email: 'u@claw.local', role: 'USER' });
  });

  it.each([
    ['generate', generate],
    ['chat', chat],
  ])('accepts the inter-service token on %s', (_name, handler) => {
    const { context, request } = contextFor(handler, OllamaController, `Service ${SERVICE_TOKEN}`);
    expect(guard.canActivate(context)).toBe(true);
    expect(request.user).toBeUndefined();
  });

  it('refuses a wrong service token, including one of another length', () => {
    expect(() =>
      guard.canActivate(
        contextFor(generate, OllamaController, `Service ${'x'.repeat(40)}`).context,
      ),
    ).toThrow(UnauthorizedException);
    expect(() =>
      guard.canActivate(contextFor(generate, OllamaController, 'Service short').context),
    ).toThrow(UnauthorizedException);
  });

  it('refuses an invalid JWT', () => {
    const { context } = contextFor(generate, OllamaController, 'Bearer not-a-jwt');
    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('does not let the service token unlock a route that did not opt in', () => {
    const { context } = contextFor(pullModel, OllamaController, `Service ${SERVICE_TOKEN}`);
    expect(() => guard.canActivate(context)).toThrow('Service token not accepted on this route');
  });

  it('keeps the health route public', () => {
    expect(guard.canActivate(contextFor(health, OllamaController).context)).toBe(true);
  });

  it('leaves internal routes to ServiceTokenGuard (public to the user-JWT guard)', () => {
    const handler = OllamaInternalController.prototype.getInstalledModels as Handler;
    expect(guard.canActivate(contextFor(handler, OllamaInternalController).context)).toBe(true);
  });
});
