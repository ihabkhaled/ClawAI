import { UnauthorizedException } from '@nestjs/common';
import { vi } from 'vitest';

import { AppConfig } from '../../config/app.config';
import { ServiceTokenGuard } from '../service-token.guard';
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

const TOKEN = 't'.repeat(40);

const contextWith = (authorization?: string): never =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({ headers: authorization === undefined ? {} : { authorization } }),
    }),
  }) as never;

describe('ServiceTokenGuard (internal ollama routes, ADR-144)', () => {
  beforeEach(() => {
    vi.spyOn(AppConfig, 'get').mockReturnValue({ INTER_SERVICE_AUTH_TOKEN: TOKEN } as never);
  });

  it('refuses a caller with no token', () => {
    expect(() => new ServiceTokenGuard().canActivate(contextWith())).toThrow(UnauthorizedException);
  });

  it('refuses a user bearer token', () => {
    expect(() => new ServiceTokenGuard().canActivate(contextWith(`Bearer ${TOKEN}`))).toThrow(
      UnauthorizedException,
    );
  });

  it('refuses a wrong service token, including one of a different length', () => {
    const guard = new ServiceTokenGuard();
    expect(() => guard.canActivate(contextWith(`Service ${'x'.repeat(40)}`))).toThrow(
      UnauthorizedException,
    );
    expect(() => guard.canActivate(contextWith('Service short'))).toThrow(UnauthorizedException);
  });

  it('admits the shared service token', () => {
    expect(new ServiceTokenGuard().canActivate(contextWith(`Service ${TOKEN}`))).toBe(true);
  });

  it('guards the whole internal controller', () => {
    const guards: unknown = Reflect.getMetadata('__guards__', OllamaInternalController);
    expect(guards).toEqual([ServiceTokenGuard]);
  });
});
