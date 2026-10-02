import { UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import jwt from 'jsonwebtoken';
import { vi } from 'vitest';

import { AppConfig } from '../../config/app.config';
import { AuthGuard } from '../auth.guard';
import { InferenceController } from '../../../modules/inference/controllers/inference.controller';
import { PullJobsController } from '../../../modules/pull-jobs/controllers/pull-jobs.controller';
import { ModelsLifecycleController } from '../../../modules/models-lifecycle/controllers/models-lifecycle.controller';
import { HealthController } from '../../../modules/health/controllers/health.controller';
import { CatalogInternalController } from '../../../modules/catalog/controllers/catalog-internal.controller';

// Importing the real controllers loads module-level AppConfig reads; give the
// schema the required values before any import runs.
vi.hoisted(() => {
  process.env['LLAMACPP_DATABASE_URL'] = 'postgresql://test/test';
  process.env['LLAMACPP_SERVICE_URL'] = 'http://llamacpp-service:4017';
  process.env['LLAMACPP_DATA_PATH'] = '/tmp/llamacpp-test';
  process.env['RABBITMQ_URL'] = 'amqp://rabbitmq:5672';
  process.env['JWT_SECRET'] = 's'.repeat(40);
});

const JWT_SECRET = 's'.repeat(40);
const SERVICE_TOKEN = 't'.repeat(40);

type Handler = (...args: never[]) => unknown;
type Ctor = abstract new (...args: never[]) => unknown;
type FakeRequest = { headers: Record<string, string>; user?: unknown };

const contextFor = (
  handler: Handler,
  controller: Ctor,
  authorization?: string,
): { context: never; request: FakeRequest } => {
  const request: FakeRequest = {
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

const ROUTES: Array<[string, Handler, Ctor]> = [
  [
    'v1/chat/completions',
    InferenceController.prototype.chatCompletions as Handler,
    InferenceController,
  ],
  ['v1/completions', InferenceController.prototype.completions as Handler, InferenceController],
  ['pull-jobs/:id/progress', PullJobsController.prototype.progress as Handler, PullJobsController],
];

describe('AuthGuard — llama.cpp inference and pull progress (ADR-144)', () => {
  const guard = new AuthGuard(new Reflector());

  beforeEach(() => {
    vi.spyOn(AppConfig, 'get').mockReturnValue({
      JWT_SECRET,
      INTER_SERVICE_AUTH_TOKEN: SERVICE_TOKEN,
    } as never);
  });

  it.each(ROUTES)('refuses an anonymous call to %s with 401', (_name, handler, controller) => {
    const { context } = contextFor(handler, controller);
    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it.each(ROUTES)('accepts a user JWT on %s', (_name, handler, controller) => {
    const { context, request } = contextFor(handler, controller, `Bearer ${userJwt()}`);
    expect(guard.canActivate(context)).toBe(true);
    expect(request.user).toEqual({ id: 'user-1', email: 'u@claw.local', role: 'USER' });
  });

  it.each(ROUTES)('accepts the inter-service token on %s', (_name, handler, controller) => {
    const { context } = contextFor(handler, controller, `Service ${SERVICE_TOKEN}`);
    expect(guard.canActivate(context)).toBe(true);
  });

  it('refuses a wrong service token, including one of another length', () => {
    const [, handler, controller] = ROUTES[0] as [string, Handler, Ctor];
    expect(() =>
      guard.canActivate(contextFor(handler, controller, `Service ${'x'.repeat(40)}`).context),
    ).toThrow(UnauthorizedException);
    expect(() =>
      guard.canActivate(contextFor(handler, controller, 'Service short').context),
    ).toThrow(UnauthorizedException);
  });

  it('refuses an invalid JWT', () => {
    const [, handler, controller] = ROUTES[0] as [string, Handler, Ctor];
    expect(() =>
      guard.canActivate(contextFor(handler, controller, 'Bearer not-a-jwt').context),
    ).toThrow(UnauthorizedException);
  });

  it('does not let the service token unlock a route that did not opt in (model load)', () => {
    const { context } = contextFor(
      ModelsLifecycleController.prototype.load as Handler,
      ModelsLifecycleController,
      `Service ${SERVICE_TOKEN}`,
    );
    expect(() => guard.canActivate(context)).toThrow('Service token not accepted on this route');
  });

  it('keeps health public', () => {
    const { context } = contextFor(HealthController.prototype.check as Handler, HealthController);
    expect(guard.canActivate(context)).toBe(true);
  });

  it('leaves internal routes to ServiceTokenGuard (public to the user-JWT guard)', () => {
    const { context } = contextFor(
      CatalogInternalController.prototype.getLoadedSnapshot as Handler,
      CatalogInternalController,
    );
    expect(guard.canActivate(context)).toBe(true);
  });
});
